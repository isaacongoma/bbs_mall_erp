import frappe
from frappe.model.document import Document


class ConsoleLog(Document):
    doctype = 'Console Log'

    _DOCTYPE_NAME = "Console Log"


    def after_delete(self):
        frappe.throw(frappe._("Console Logs can not be deleted"))
