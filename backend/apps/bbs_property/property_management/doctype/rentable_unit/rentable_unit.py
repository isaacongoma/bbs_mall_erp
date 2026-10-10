import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, flt


class RentableUnit(Document):
    doctype = "Rentable Unit"

    def autoname(self):
        abbr = frappe.db.get_value("Property", self.property, "abbr") or self.property
        self.unit_code = (self.unit_code or "").strip().upper()
        self.name = f"{abbr}-{self.unit_code}"

    def validate(self):
        if self.floor and frappe.db.get_value("Property Floor", self.floor, "property") != self.property:
            frappe.throw(_("Floor {0} does not belong to {1}.").format(self.floor, self.property))
        if flt(self.area_sqm) <= 0:
            frappe.throw(_("Area must be greater than zero."))
        if flt(self.rate_per_sqm) and not flt(self.base_rent):
            self.base_rent = flt(self.rate_per_sqm) * flt(self.area_sqm)
        if flt(self.service_charge_per_sqm) and not flt(self.service_charge):
            self.service_charge = flt(self.service_charge_per_sqm) * flt(self.area_sqm)
        if not self.unit_name:
            self.unit_name = self.unit_code
        if self.status == "Occupied" and not self.current_lease:
            frappe.throw(_("A unit becomes Occupied through a lease. Create a lease for this unit instead."))

    def after_insert(self):
        self.refresh_property()

    def on_update(self):
        self.refresh_property()

    def on_trash(self):
        if frappe.db.exists("Lease Unit", {"unit": self.name}):
            frappe.throw(_("This unit appears on a lease and cannot be deleted."))

    def refresh_property(self):
        from apps.bbs_property.property_management.doctype.property.property import refresh_property_metrics

        refresh_property_metrics(self.property)

    @frappe.whitelist()
    def create_lease(self):
        return {"property": self.property, "units": [{"unit": self.name, "monthly_rent": self.base_rent, "monthly_service_charge": self.service_charge}]}
