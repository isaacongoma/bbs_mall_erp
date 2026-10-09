import frappe
from frappe.model.document import Document


class APIRequestLog(Document):
    doctype = 'API Request Log'

    _DOCTYPE_NAME = "API Request Log"


    @staticmethod
    def clear_old_logs(days: int = 90):
        from frappe.query_builder import Interval
        from frappe.query_builder.functions import Now

        table = frappe.qb.DocType("API Request Log")
        frappe.db.delete(table, filters=(table.creation < (Now() - Interval(days=days))))
