import frappe
from frappe.model.document import Document


class WebsiteScript(Document):
    doctype = 'Website Script'

    _DOCTYPE_NAME = "Website Script"


    def on_update(self):
        """clear cache"""
        frappe.clear_cache(user="Guest")

        from frappe.website.utils import clear_cache

        clear_cache()
