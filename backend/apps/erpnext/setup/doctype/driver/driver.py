import frappe
from frappe.model.document import Document


class Driver(Document):


    doctype = 'Driver'

    def validate(self):
        if self.employee:
            self.user = frappe.get_value("Employee", self.employee, "user_id")
