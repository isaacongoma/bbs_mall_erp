from frappe.contacts.address_and_contact import load_address_and_contact
from frappe.model.document import Document


class Manufacturer(Document):


    doctype = 'Manufacturer'

    def onload(self):
        """Load address and contacts in `__onload`"""
        load_address_and_contact(self)
