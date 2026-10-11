import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate

REQUIRED = {
    "Category": ["item_group"],
    "Seller": ["seller"],
    "Brand": ["brand"],
    "Category and Seller": ["item_group", "seller"],
    "Everything": [],
}


class CommissionRule(Document):
    doctype = "Commission Rule"

    def validate(self):
        if flt(self.rate_percent) < 0 or flt(self.rate_percent) > 100:
            frappe.throw(_("Commission % must be between 0 and 100"))
        if self.valid_from and self.valid_upto and getdate(self.valid_from) > getdate(self.valid_upto):
            frappe.throw(_("Valid From is after Valid Until"))
        for field in REQUIRED.get(self.applies_to, []):
            if not self.get(field):
                frappe.throw(_("Choose a {0} for this rule").format(self.meta.get_label(field)))
        if flt(self.min_fee) and flt(self.max_fee) and flt(self.min_fee) > flt(self.max_fee):
            frappe.throw(_("Minimum fee is above the maximum fee"))
