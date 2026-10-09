import frappe
from frappe.model.document import Document


class ClientScript(Document):
    doctype = 'Client Script'

    _DOCTYPE_NAME = "Client Script"


    def on_update(self):
        frappe.clear_cache(doctype=self.dt)

    def on_trash(self):
        frappe.clear_cache(doctype=self.dt)
