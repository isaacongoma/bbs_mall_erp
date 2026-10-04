import frappe
from frappe.model.document import Document
from frappe.query_builder import Interval
from frappe.query_builder.functions import Now


class ScheduledJobLog(Document):
    doctype = 'Scheduled Job Log'

    _DOCTYPE_NAME = "Scheduled Job Log"


    @staticmethod
    def clear_old_logs(days=90):
        table = frappe.qb.DocType("Scheduled Job Log")
        frappe.db.delete(table, filters=(table.creation < (Now() - Interval(days=days))))
