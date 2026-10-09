import frappe
from frappe import _
from frappe.model.document import Document

from erpnext import get_region


class SouthAfricaVATSettings(Document):


    doctype = 'South Africa VAT Settings'

    def validate(self):
        self.validate_company_region()

    def validate_company_region(self):
        if self.company and get_region(self.company) != "South Africa":
            frappe.throw(_("Company {0} is not in South Africa.").format(frappe.bold(self.company)))
