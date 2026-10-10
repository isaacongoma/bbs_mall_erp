import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

from apps.bbs_property.property_management import billing


class LeaseDeposit(Document):
    doctype = "Lease Deposit"

    def validate(self):
        if flt(self.amount) <= 0:
            frappe.throw(_("Amount must be greater than zero."))
        if self.transaction_type in ("Receipt", "Refund") and not self.bank_account:
            frappe.throw(_("Select the cash or bank account."))
        if self.transaction_type == "Deduction" and not self.against_invoice:
            frappe.throw(_("Select the invoice the deduction is applied against."))
        if self.transaction_type != "Receipt":
            held = billing.deposit_figures(self.lease)["balance"]
            if flt(self.amount) > flt(held) + 0.005:
                frappe.throw(_("Only {0} is held on this lease.").format(flt(held, 2)))

    def liability_account(self):
        property_name = frappe.db.get_value("Lease Agreement", self.lease, "property")
        account = frappe.db.get_value("Property", property_name, "security_deposit_account")
        if not account:
            frappe.throw(_("Set the Security Deposit Liability Account on property {0}.").format(property_name))
        return account

    def on_submit(self):
        liability = self.liability_account()
        entry = frappe.new_doc("Journal Entry")
        entry.voucher_type = "Journal Entry"
        entry.company = self.company
        entry.posting_date = self.posting_date
        entry.cheque_no = self.reference_no
        entry.cheque_date = self.reference_date
        entry.user_remark = _("{0} - security deposit for {1} ({2})").format(self.transaction_type, self.lease, self.customer)
        if self.transaction_type == "Receipt":
            entry.append("accounts", {"account": self.bank_account, "debit_in_account_currency": self.amount})
            entry.append("accounts", {"account": liability, "credit_in_account_currency": self.amount})
        elif self.transaction_type == "Refund":
            entry.append("accounts", {"account": liability, "debit_in_account_currency": self.amount})
            entry.append("accounts", {"account": self.bank_account, "credit_in_account_currency": self.amount})
        else:
            receivable = frappe.get_cached_value("Company", self.company, "default_receivable_account")
            entry.append("accounts", {"account": liability, "debit_in_account_currency": self.amount})
            entry.append(
                "accounts",
                {
                    "account": receivable,
                    "party_type": "Customer",
                    "party": self.customer,
                    "credit_in_account_currency": self.amount,
                    "reference_type": "Sales Invoice",
                    "reference_name": self.against_invoice,
                },
            )
        entry.insert(ignore_permissions=True)
        entry.submit()
        self.db_set("journal_entry", entry.name)
        billing.refresh_lease_totals(self.lease)

    def on_cancel(self):
        if self.journal_entry:
            entry = frappe.get_doc("Journal Entry", self.journal_entry)
            if entry.docstatus == 1:
                entry.cancel()
        billing.refresh_lease_totals(self.lease)
