import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class MarketplaceWishlistItem(Document):
    doctype = "Marketplace Wishlist Item"

    def validate(self):
        if frappe.db.exists("Marketplace Wishlist Item", {"customer": self.customer, "listing": self.listing, "name": ["!=", self.name or ""]}):
            frappe.throw(_("This product is already on the wishlist"))
        self.added_on = self.added_on or now_datetime()

    def after_insert(self):
        self.refresh_count()

    def on_trash(self):
        self.refresh_count(exclude=self.name)

    def refresh_count(self, exclude=None):
        total = frappe.db.count("Marketplace Wishlist Item", {"listing": self.listing})
        if exclude and frappe.db.exists("Marketplace Wishlist Item", exclude):
            total -= 1
        frappe.db.set_value("Marketplace Listing", self.listing, "wishlist_count", max(0, total), update_modified=False)
