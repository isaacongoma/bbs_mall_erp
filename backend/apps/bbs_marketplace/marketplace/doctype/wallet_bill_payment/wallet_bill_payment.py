import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

from apps.bbs_marketplace.marketplace import accounting, wallet
from apps.bbs_marketplace.marketplace.utils import get_settings


class WalletBillPayment(Document):
    doctype = "Wallet Bill Payment"

    def validate(self):
        if not self.company:
            self.company = get_settings().company
        seller = frappe.get_doc("Marketplace Seller", self.seller)
        if seller.status != "Active":
            frappe.throw(_("The seller account is not active"))
        total = 0.0
        seen = set()
        for row in self.invoices:
            if row.sales_invoice in seen:
                frappe.throw(_("Row {0}: invoice {1} appears twice").format(row.idx, row.sales_invoice))
            seen.add(row.sales_invoice)
            invoice = frappe.db.get_value("Sales Invoice", row.sales_invoice, ["customer", "docstatus", "outstanding_amount", "company", "is_return"], as_dict=True)
            if not invoice or invoice.docstatus != 1 or invoice.is_return:
                frappe.throw(_("Row {0}: {1} is not a submitted invoice").format(row.idx, row.sales_invoice))
            if invoice.customer != seller.customer:
                frappe.throw(_("Row {0}: {1} belongs to {2}, not to this tenant").format(row.idx, row.sales_invoice, invoice.customer))
            row.outstanding_amount = flt(invoice.outstanding_amount, 2)
            row.bill_type = self.bill_type_of(row.sales_invoice)
            if flt(row.allocated_amount) <= 0:
                frappe.throw(_("Row {0}: enter the amount to pay").format(row.idx))
            if flt(row.allocated_amount) > flt(invoice.outstanding_amount) + 0.004:
                frappe.throw(_("Row {0}: only {1} is outstanding on {2}").format(row.idx, flt(invoice.outstanding_amount), row.sales_invoice))
            total += flt(row.allocated_amount)
        self.total_amount = flt(total, 2)
        if self.docstatus == 0:
            values = wallet.balances(self.seller)
            self.available_before = values["available"]

    def bill_type_of(self, invoice):
        row = frappe.db.sql(
            'select item_name from "tabSales Invoice Item" where parent = %s order by idx limit 1', invoice
        )
        return row[0][0] if row else "Invoice"

    def before_submit(self):
        wallet.require_available(self.seller, self.total_amount)

    def on_submit(self):
        journal = accounting.post_bill_payment(self)
        self.db_set("journal_entry", journal)
        wallet.post_transaction(self.seller, "Bill Payment", -flt(self.total_amount), reference=("Wallet Bill Payment", self.name), journal_entry=journal, remarks=_("Paid {0} invoice(s) from the wallet").format(len(self.invoices)))
        self.refresh_leases()

    def on_cancel(self):
        accounting.cancel_journal(self.journal_entry)
        wallet.post_transaction(self.seller, "Reversal", flt(self.total_amount), reference=("Wallet Bill Payment", self.name), remarks=_("Cancelled bill payment {0}").format(self.name))
        self.refresh_leases()

    def refresh_leases(self):
        try:
            from apps.bbs_property.property_management import billing

            for row in self.invoices:
                billing.refresh_lease_for_invoice(frappe.get_doc("Sales Invoice", row.sales_invoice))
        except Exception:
            frappe.log_error(title="Lease refresh after wallet payment failed")
