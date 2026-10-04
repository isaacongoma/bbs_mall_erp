import frappe
from frappe import _, bold
from frappe.model.document import Document
from frappe.utils import flt


class WorkstationType(Document):


    doctype = 'Workstation Type'

    def validate(self):
        self.validate_duplicate_operating_component()

    def validate_duplicate_operating_component(self):
        components = []
        for row in self.workstation_costs:
            if row.operating_component not in components:
                components.append(row.operating_component)
            else:
                frappe.throw(
                    _("Duplicate Operating Component {0} found in Operating Components").format(
                        bold(row.operating_component)
                    )
                )

    def before_save(self):
        self.set_hour_rate()

    def set_hour_rate(self):
        self.hour_rate = 0.0

        for row in self.workstation_costs:
            if row.operating_cost:
                self.hour_rate += flt(row.operating_cost)


def get_workstations(workstation_type):
    workstations = frappe.get_all(
        "Workstation", filters={"workstation_type": workstation_type}, order_by="creation"
    )

    return [workstation.name for workstation in workstations]
