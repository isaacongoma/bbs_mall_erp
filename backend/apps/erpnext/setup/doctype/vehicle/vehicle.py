import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate


class Vehicle(Document):


    doctype = 'Vehicle'

    def validate(self):
        if getdate(self.start_date) > getdate(self.end_date):
            frappe.throw(_("Insurance Start date should be less than Insurance End date"))
        if getdate(self.carbon_check_date) > getdate():
            frappe.throw(_("Last carbon check date cannot be a future date"))
