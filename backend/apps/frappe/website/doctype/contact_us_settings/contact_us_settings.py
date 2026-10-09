import frappe
from frappe.model.document import Document


class ContactUsSettings(Document):
    doctype = 'Contact Us Settings'

    _DOCTYPE_NAME = "Contact Us Settings"


    def on_update(self):
        from frappe.website.utils import clear_cache

        clear_cache("contact")
