import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, now_datetime

from apps.bbs_marketplace.marketplace import accounting, orders
from apps.bbs_marketplace.marketplace.utils import get_settings


class MarketplacePayment(Document):
    doctype = "Marketplace Payment"

    def validate(self):
        if not self.company:
            self.company = get_settings().company
        if flt(self.amount) <= 0:
            frappe.throw(_("The payment amount must be above zero"))
        order = frappe.get_doc("Marketplace Order", self.marketplace_order)
        if self.is_new() and self.status in ("Initiated", "Pending") and order.status in ("Cancelled", "Refunded", "Failed"):
            frappe.throw(_("Order {0} is {1}").format(order.name, order.status))
        if self.is_new() and self.status in ("Initiated", "Pending") and flt(self.amount) > flt(order.outstanding_amount) + 0.005:
            frappe.throw(_("The amount is more than the balance of {0}").format(flt(order.outstanding_amount)))

    @frappe.whitelist()
    def mark_paid(self, paid_amount=None, receipt=None):
        self.check_permission("write")
        if self.status == "Paid":
            return self
        if receipt:
            self.gateway_receipt = receipt
        if paid_amount:
            self.amount = flt(paid_amount)
        self.status = "Paid"
        self.paid_on = now_datetime()
        self.flags.ignore_permissions = True
        self.save()
        accounting.record_payment_entry(self)
        orders.apply_payment(self.marketplace_order)
        return self

    @frappe.whitelist()
    def mark_failed(self, reason):
        self.check_permission("write")
        self.status = "Failed"
        self.failure_reason = reason
        self.flags.ignore_permissions = True
        self.save()
