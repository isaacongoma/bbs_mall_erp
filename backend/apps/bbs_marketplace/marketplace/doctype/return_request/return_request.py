import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, cint, flt, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace import accounting, extras, inventory, orders
from apps.bbs_marketplace.marketplace.utils import get_settings, log_event

SELLER_FAULT = {"Damaged on Arrival", "Wrong Item", "Not as Described", "Faulty", "Missing Parts"}
FLOW = {
    "Requested": {"Approved", "Rejected"},
    "Approved": {"Pickup Scheduled", "Received", "Rejected"},
    "Pickup Scheduled": {"Received"},
    "Received": {"Refunded"},
    "Refunded": {"Closed"},
    "Rejected": {"Closed"},
    "Closed": set(),
}


class ReturnRequest(Document):
    doctype = "Return Request"

    def validate(self):
        so = frappe.get_doc("Seller Order", self.seller_order)
        if so.marketplace_order != self.marketplace_order:
            frappe.throw(_("The seller order does not belong to this order"))
        if self.is_new():
            self.check_eligible(so)
            self.price_items(so)
            if self.reason in SELLER_FAULT:
                self.seller_liable = 1
        before = self.get_doc_before_save()
        if before and before.status != self.status and self.status not in FLOW.get(before.status, set()):
            frappe.throw(_("A return cannot move from {0} to {1}").format(before.status, self.status))

    def check_eligible(self, so):
        if so.status not in ("Delivered", "Completed"):
            frappe.throw(_("Only delivered orders can be returned"))
        window = None
        for row in so.items:
            listing = frappe.db.get_value("Marketplace Listing", row.listing, ["return_eligible", "return_window_days"], as_dict=True)
            if not cint(listing.return_eligible) and self.reason not in SELLER_FAULT:
                frappe.throw(_("{0} cannot be returned for this reason").format(row.item_name))
            days = cint(listing.return_window_days) or cint(get_settings().return_window_days)
            window = days if window is None else min(window, days)
        if so.delivered_on and getdate(add_days(so.delivered_on, window or 0)) < getdate(today()) and self.reason not in SELLER_FAULT:
            frappe.throw(_("The return window of {0} days has closed").format(window))

    def price_items(self, so):
        total = 0.0
        for row in self.items:
            line = next((r for r in so.items if str(r.name) == str(row.order_item) or r.listing == row.order_item), None)
            if not line:
                frappe.throw(_("Row {0}: that item is not on the seller order").format(row.idx))
            returnable = flt(line.qty) - flt(line.returned_qty)
            if flt(row.qty) <= 0 or flt(row.qty) > returnable:
                frappe.throw(_("Row {0}: only {1} can still be returned").format(row.idx, returnable))
            row.listing = line.listing
            row.item_name = line.item_name
            row.refund_amount = flt(flt(line.amount) * flt(row.qty) / flt(line.qty), 2)
            total += row.refund_amount
        self.refund_amount = flt(total, 2)

    @frappe.whitelist()
    def decide(self, approve, note=None):
        self.check_permission("write")
        approve = cint(approve)
        self.status = "Approved" if approve else "Rejected"
        self.decision_note = note
        self.decided_by = frappe.session.user
        log_event(self, self.status, note)
        self.flags.ignore_permissions = True
        self.save()

    @frappe.whitelist()
    def receive(self):
        self.check_permission("write")
        self.status = "Received"
        log_event(self, "Received")
        self.flags.ignore_permissions = True
        self.save()

    @frappe.whitelist()
    def refund(self):
        self.check_permission("write")
        if self.status != "Received" and not (self.status == "Approved" and self.resolution != "Replacement"):
            frappe.throw(_("Receive the goods before refunding"))
        so = frappe.get_doc("Seller Order", self.seller_order)
        order = frappe.get_doc("Marketplace Order", self.marketplace_order)
        gross = flt(self.refund_amount, 2)
        ratio = gross / flt(so.items_total) if flt(so.items_total) else 0
        if so.journal_entry:
            if self.seller_liable:
                journal = accounting.reverse_settlement_portion(
                    so.name,
                    gross,
                    flt(so.commission_amount * ratio, 2),
                    flt(so.commission_vat * ratio, 2),
                    flt(so.platform_discount * ratio, 2),
                    reference=self.name,
                )
            else:
                journal = extras.absorb_refund(so.name, gross, self.name)
            self.reverse_journal = journal
        entry = orders.record_refund(order, gross, _("Return {0}").format(self.name)) if flt(order.paid_amount) > 0 else None
        self.refund_entry = entry
        for row in self.items:
            line = next((r for r in so.items if str(r.name) == str(row.order_item)), None) or next((r for r in so.items if r.listing == row.listing), None)
            if line:
                frappe.db.set_value("Seller Order Item", line.name, "returned_qty", flt(line.returned_qty) + flt(row.qty), update_modified=False)
            if cint(row.restock):
                inventory.restock(row.listing, row.qty, line.variant_item if line else None)
        self.status = "Refunded"
        log_event(self, "Refunded", _("Refunded {0}").format(gross))
        self.flags.ignore_permissions = True
        self.save()
        orders.apply_payment(order.name)
        so.reload()
        if all(flt(r.returned_qty) >= flt(r.qty) for r in so.items):
            frappe.db.set_value("Seller Order", so.name, "status", "Returned", update_modified=False)
            orders.roll_up_status(order.name)
        return self
