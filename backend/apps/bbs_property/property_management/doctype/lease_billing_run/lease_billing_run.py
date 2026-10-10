import frappe
from django.db import transaction
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt

from apps.bbs_property.property_management import billing


class LeaseBillingRun(Document):
    doctype = "Lease Billing Run"

    def validate(self):
        if self.docstatus == 0:
            self.preview_items()

    def preview_items(self):
        self.set("items", [])
        leases = billing.due_leases(self.company, self.property, self.run_date)
        for lease in leases:
            period = billing.next_period(lease)
            self.append(
                "items",
                {
                    "lease": lease.name,
                    "customer": lease.customer,
                    "period_start": period[0],
                    "period_end": period[1],
                    "status": "Pending",
                },
            )
        self.leases_found = len(leases)

    @frappe.whitelist()
    def fetch_due_leases(self):
        self.check_permission("write")
        self.preview_items()
        return self.as_dict()

    def before_submit(self):
        if not self.items:
            frappe.throw(_("There are no leases due for billing on {0}.").format(self.run_date))

    def on_submit(self):
        created = errors = 0
        total = 0.0
        for row in self.items:
            lease = frappe.get_doc("Lease Agreement", row.lease)
            period = billing.next_period(lease)
            invoice = None
            try:
                with transaction.atomic():
                    if period and billing.is_due(lease, self.run_date):
                        invoice = billing.make_lease_invoice(
                            lease,
                            period[0],
                            period[1],
                            posting_date=self.run_date,
                            include_utilities=cint(self.include_utilities),
                            include_turnover=cint(self.include_turnover),
                            submit=cint(self.submit_invoices),
                        )
            except Exception as error:
                errors += 1
                row.db_set({"status": "Error", "message": str(error)[:500]})
                continue
            if invoice is None:
                row.db_set({"status": "Skipped", "message": _("Nothing to invoice")})
                continue
            row.db_set(
                {
                    "sales_invoice": invoice.name,
                    "amount": invoice.grand_total,
                    "status": "Invoiced",
                    "period_start": period[0],
                    "period_end": period[1],
                }
            )
            created += 1
            total += flt(invoice.grand_total)
        self.db_set(
            {
                "invoices_created": created,
                "errors": errors,
                "total_amount": total,
                "status": "Completed with Errors" if errors else "Completed",
            }
        )

    def on_cancel(self):
        for row in self.items:
            if not row.sales_invoice:
                continue
            invoice = frappe.get_doc("Sales Invoice", row.sales_invoice)
            if invoice.docstatus == 1:
                if flt(invoice.outstanding_amount) < flt(invoice.grand_total):
                    frappe.throw(_("Invoice {0} has payments against it and cannot be cancelled.").format(invoice.name))
                invoice.cancel()
            elif invoice.docstatus == 0:
                frappe.delete_doc("Sales Invoice", invoice.name, force=1)
            if row.lease:
                billing.rewind_lease(row.lease, row.period_start)
        self.db_set("status", "Cancelled")
