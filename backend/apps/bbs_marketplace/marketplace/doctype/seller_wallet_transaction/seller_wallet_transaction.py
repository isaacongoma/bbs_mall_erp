import frappe
from frappe import _
from frappe.model.document import Document


class SellerWalletTransaction(Document):
    doctype = "Seller Wallet Transaction"

    def validate(self):
        if not self.is_new():
            before = self.get_doc_before_save()
            if before and (before.amount != self.amount or before.seller != self.seller or before.transaction_type != self.transaction_type):
                frappe.throw(_("Wallet entries cannot be edited. Post an adjustment instead"))

    def on_trash(self):
        frappe.throw(_("Wallet entries cannot be deleted"))
