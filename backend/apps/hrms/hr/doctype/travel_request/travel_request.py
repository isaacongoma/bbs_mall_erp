from frappe.model.document import Document

from hrms.hr.utils import validate_active_employee


class TravelRequest(Document):


    doctype = 'Travel Request'

    def validate(self):
        validate_active_employee(self.employee)
