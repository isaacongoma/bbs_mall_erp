import frappe
from frappe.model.document import Document


class ViewLog(Document):
    doctype = 'View Log'

    _DOCTYPE_NAME = "View Log"


    @staticmethod
    def clear_old_logs(days=180):
        from frappe.query_builder import Interval
        from frappe.query_builder.functions import Now

        table = frappe.qb.DocType("View Log")
        frappe.db.delete(table, filters=(table.creation < (Now() - Interval(days=days))))
