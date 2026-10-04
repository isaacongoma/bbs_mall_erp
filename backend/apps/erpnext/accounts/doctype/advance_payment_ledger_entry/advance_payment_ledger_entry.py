import frappe
from frappe.model.document import Document

from erpnext.accounts.utils import get_advance_payment_doctypes, update_voucher_outstanding


class AdvancePaymentLedgerEntry(Document):


    doctype = 'Advance Payment Ledger Entry'

    def on_update(self):
        if (
            self.against_voucher_type in get_advance_payment_doctypes()
            and self.flags.update_outstanding == "Yes"
            and not frappe.flags.is_reverse_depr_entry
        ):
            update_voucher_outstanding(self.against_voucher_type, self.against_voucher_no, None, None, None)


def on_doctype_update():
    frappe.db.add_index(
        "Advance Payment Ledger Entry",
        ["against_voucher_type", "against_voucher_no"],
    )

    frappe.db.add_index(
        "Advance Payment Ledger Entry",
        ["voucher_type", "voucher_no"],
    )
