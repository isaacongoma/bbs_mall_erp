import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate

from apps.bbs_property.property_management import billing


class TenantSalesDeclaration(Document):
    doctype = "Tenant Sales Declaration"

    def validate(self):
        if getdate(self.period_end) < getdate(self.period_start):
            frappe.throw(_("Period end cannot be before the period start."))
        lease = frappe.get_doc("Lease Agreement", self.lease)
        if not lease.turnover_rent_applicable:
            frappe.throw(_("Lease {0} does not charge turnover rent.").format(lease.name))
        if flt(self.gross_sales) < 0:
            frappe.throw(_("Sales cannot be negative."))
        overlap = frappe.db.exists(
            "Tenant Sales Declaration",
            {
                "lease": self.lease,
                "name": ["!=", self.name or ""],
                "status": ["in", ["Pending Approval", "Approved", "Billed"]],
                "period_start": ["<=", self.period_end],
                "period_end": [">=", self.period_start],
            },
        )
        if overlap:
            frappe.throw(_("Declaration {0} already covers part of this period.").format(overlap))
        self.turnover_rent_percent = lease.turnover_rent_percent
        self.base_rent_for_period = billing.rent_between(lease, self.period_start, self.period_end)
        due = flt(self.gross_sales) * flt(self.turnover_rent_percent) / 100 - flt(self.base_rent_for_period)
        self.turnover_rent_due = flt(max(0.0, due), 2)

    @frappe.whitelist()
    def approve(self):
        self.check_permission("write")
        self.status = "Approved"
        self.save()
        return self.status

    @frappe.whitelist()
    def reject(self, reason=None):
        self.check_permission("write")
        self.status = "Rejected"
        if reason:
            self.remarks = reason
        self.save()
        return self.status
