import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class UtilityMeter(Document):
    doctype = "Utility Meter"

    def validate(self):
        if frappe.db.get_value("Rentable Unit", self.unit, "property") != self.property:
            frappe.throw(_("Unit {0} is not in {1}.").format(self.unit, self.property))
        tariff_type = frappe.db.get_value("Utility Tariff", self.tariff, "utility_type")
        if tariff_type != self.utility_type:
            frappe.throw(_("Tariff {0} is for {1}, not {2}.").format(self.tariff, tariff_type, self.utility_type))
        if self.is_new():
            self.last_reading = flt(self.initial_reading)
