import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt, getdate, nowdate

from apps.bbs_property.property_management.doctype.utility_tariff.utility_tariff import compute_charge


class MeterReading(Document):
    doctype = "Meter Reading"

    def validate(self):
        meter = frappe.get_doc("Utility Meter", self.meter)
        if meter.status != "Active":
            frappe.throw(_("Meter {0} is {1}.").format(meter.name, meter.status))
        if getdate(self.reading_date) > getdate(nowdate()):
            frappe.throw(_("Reading date cannot be in the future."))
        if self.is_new() or self.status in ("Pending Approval", "Rejected"):
            self.previous_reading = flt(meter.last_reading)
        self.multiplier = flt(meter.multiplier) or 1
        if flt(self.current_reading) < flt(self.previous_reading):
            frappe.throw(_("Current reading {0} is lower than the previous reading {1}.").format(self.current_reading, self.previous_reading))
        self.consumption = flt((flt(self.current_reading) - flt(self.previous_reading)) * self.multiplier, 3)
        self.tariff = meter.tariff
        self.amount = compute_charge(frappe.get_doc("Utility Tariff", meter.tariff), self.consumption)
        self.assign_tenant()
        if self.is_new() and self.source == "Tenant Portal":
            if cint(frappe.get_single("Property Settings").require_reading_approval):
                self.status = "Pending Approval"

    def assign_tenant(self):
        row = frappe.db.sql(
            """
            select l.name, l.customer from "tabLease Agreement" l
            join "tabLease Unit" u on u.parent = l.name
            where u.unit = %s and l.docstatus = 1
              and l.status in ('Active', 'Expiring Soon', 'Expired', 'Terminated')
              and l.start_date <= %s
            order by l.start_date desc limit 1
            """,
            (self.unit, self.reading_date),
        )
        if row:
            self.lease, self.customer = row[0]

    def on_update(self):
        if self.status in ("Approved", "Billed"):
            frappe.db.set_value(
                "Utility Meter",
                self.meter,
                {"last_reading": self.current_reading, "last_reading_date": self.reading_date},
                update_modified=False,
            )

    @frappe.whitelist()
    def approve(self):
        self.check_permission("write")
        if self.status != "Pending Approval":
            frappe.throw(_("Only pending readings can be approved."))
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
