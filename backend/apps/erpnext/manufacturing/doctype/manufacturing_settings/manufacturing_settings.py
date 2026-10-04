import frappe
from dateutil.relativedelta import relativedelta
from frappe.model.document import Document
from frappe.utils import cint


class ManufacturingSettings(Document):


    def before_save(self):
        self.reset_values()

    def reset_values(self):
        if self.backflush_raw_materials_based_on != "BOM" and self.validate_components_quantities_per_bom:
            self.validate_components_quantities_per_bom = 0


def get_mins_between_operations():
    return relativedelta(
        minutes=cint(frappe.db.get_single_value("Manufacturing Settings", "mins_between_operations")) or 10
    )


@frappe.whitelist()
def is_material_consumption_enabled():
    if not hasattr(frappe.local, "material_consumption"):
        frappe.local.material_consumption = cint(
            frappe.db.get_single_value("Manufacturing Settings", "material_consumption")
        )

    return frappe.local.material_consumption
