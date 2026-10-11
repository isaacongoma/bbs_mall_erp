import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, now_datetime

from apps.bbs_marketplace.marketplace import catalog, inventory, plans, variants
from apps.bbs_marketplace.marketplace.utils import get_settings

TRANSITIONS = {
    "Draft": {"Pending Approval", "Archived"},
    "Pending Approval": {"Approved", "Rejected", "Draft"},
    "Approved": {"Published", "Draft", "Archived"},
    "Published": {"Paused", "Archived"},
    "Paused": {"Published", "Archived"},
    "Rejected": {"Draft", "Archived"},
    "Archived": {"Draft"},
}


class MarketplaceListing(Document):
    doctype = "Marketplace Listing"

    def validate(self):
        if self.is_new():
            plans.check_listing_limit(self.seller)
        self.validate_digital()
        variants.validate(self)
        self.validate_item_owner()
        self.validate_pricing()
        self.validate_tiers()
        self.validate_status_change()
        self.set_derived()

    def validate_digital(self):
        if not cint(self.is_digital):
            return
        if not self.digital_files:
            frappe.throw(_("Add the files buyers receive for a digital product"))
        self.allow_backorder = 1
        self.cod_allowed = 0
        self.free_delivery = 1
        self.weight_kg = 0

    def validate_item_owner(self):
        owner = frappe.db.get_value("Item", self.item, "marketplace_seller")
        if owner and owner != self.seller:
            frappe.throw(_("Item {0} belongs to another seller").format(self.item))
        listed = frappe.db.get_value("Marketplace Listing", {"item": self.item, "name": ["!=", self.name or ""], "status": ["!=", "Archived"]})
        if listed:
            frappe.throw(_("Item {0} already has the listing {1}").format(self.item, listed))
        if frappe.db.get_value("Item", self.item, "disabled"):
            frappe.throw(_("Item {0} is disabled").format(self.item))

    def validate_pricing(self):
        if flt(self.price) <= 0:
            frappe.throw(_("Enter a selling price greater than zero"))
        if flt(self.compare_at_price) and flt(self.compare_at_price) < flt(self.price):
            frappe.throw(_("Compare At Price must be higher than the price"))
        if flt(self.vat_rate) < 0 or flt(self.vat_rate) > 100:
            frappe.throw(_("VAT % must be between 0 and 100"))
        if flt(self.min_order_qty) <= 0:
            self.min_order_qty = 1
        if flt(self.max_order_qty) and flt(self.max_order_qty) < flt(self.min_order_qty):
            frappe.throw(_("Maximum order quantity is below the minimum"))

    def validate_tiers(self):
        seen = set()
        for tier in self.price_tiers:
            key = (tier.buyer_type, flt(tier.min_qty))
            if key in seen:
                frappe.throw(_("Price tier row {0} repeats a quantity for {1}").format(tier.idx, tier.buyer_type))
            seen.add(key)
            if flt(tier.min_qty) <= 0 or flt(tier.price) <= 0:
                frappe.throw(_("Price tier row {0}: quantity and price must be above zero").format(tier.idx))
            if flt(tier.price) >= flt(self.price) and tier.buyer_type == "B2B":
                frappe.throw(_("Price tier row {0}: bulk price should be below the retail price").format(tier.idx))

    def validate_status_change(self):
        before = self.get_doc_before_save()
        if not before or before.status == self.status:
            if self.is_new() and self.status not in ("Draft", "Pending Approval"):
                self.status = "Draft"
            return
        allowed = TRANSITIONS.get(before.status, set())
        if self.status not in allowed:
            frappe.throw(_("A listing cannot move from {0} to {1}").format(before.status, self.status))
        roles = set(frappe.get_roles())
        moderator = bool(roles & {"Catalog Moderator", "Marketplace Manager", "System Manager"}) or frappe.session.user == "Administrator"
        if self.status in ("Approved", "Rejected") and not moderator:
            frappe.throw(_("Only a catalog moderator can approve or reject listings"))
        if self.status == "Published":
            seller = frappe.db.get_value("Marketplace Seller", self.seller, ["status", "holiday_mode"], as_dict=True)
            if seller.status != "Active":
                frappe.throw(_("The seller account must be active to publish"))
            needs_approval = cint(get_settings().require_listing_approval)
            if needs_approval and before.status not in ("Approved", "Paused"):
                frappe.throw(_("The listing must be approved before it is published"))
            if not (self.images or self.primary_image):
                frappe.throw(_("Add at least one image before publishing"))
            self.published_on = self.published_on or now_datetime()
        if self.status == "Approved":
            self.approved_by = frappe.session.user
            self.approved_on = now_datetime()
        if self.status == "Rejected" and not self.moderation_notes:
            frappe.throw(_("Say why the listing was rejected in the moderation notes"))

    def set_derived(self):
        if not self.slug:
            self.slug = catalog.unique_slug(self.listing_title, name=self.name)
        primary = next((row for row in self.images if cint(row.is_primary)), None) or (self.images[0] if self.images else None)
        self.primary_image = primary.image if primary else self.primary_image
        if self.has_variants:
            self.stock_qty = sum(flt(row.stock_qty) for row in self.variants if cint(row.enabled))
            self.reserved_qty = sum(flt(row.reserved_qty) for row in self.variants)
            for row in self.variants:
                row.available_qty = max(0.0, inventory.variant_on_hand(self, row) - flt(row.reserved_qty))
        self.available_qty = inventory.available(self)
        if not self.return_window_days:
            self.return_window_days = cint(get_settings().return_window_days)

    def on_update(self):
        frappe.db.set_value("Item", self.item, {"marketplace_seller": self.seller, "marketplace_listing": self.name}, update_modified=False)
        if self.status in ("Published", "Approved"):
            catalog.sync_item_prices(self)

    def on_trash(self):
        if frappe.db.exists("Marketplace Order Item", {"listing": self.name}):
            frappe.throw(_("This listing has orders. Archive it instead of deleting"))
        frappe.db.set_value("Item", self.item, {"marketplace_seller": None, "marketplace_listing": None}, update_modified=False)

    def effective_price(self, qty=1, buyer_type="B2C"):
        from apps.bbs_marketplace.marketplace import pricing

        return pricing.listing_price(self, qty, buyer_type)

    @frappe.whitelist()
    def generate_variants(self, attributes):
        self.check_permission("write")
        return variants.generate(self, attributes)

    @frappe.whitelist()
    def set_status(self, status, notes=None):
        self.check_permission("write")
        self.status = status
        if notes:
            self.moderation_notes = notes
        self.save()
        return self.status
