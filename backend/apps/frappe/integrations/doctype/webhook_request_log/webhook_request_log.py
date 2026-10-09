import frappe
from frappe.model.document import Document


class WebhookRequestLog(Document):
    doctype = 'Webhook Request Log'

    _DOCTYPE_NAME = "Webhook Request Log"


    @staticmethod
    def clear_old_logs(days=30):
        from frappe.query_builder import Interval
        from frappe.query_builder.functions import Now

        table = frappe.qb.DocType("Webhook Request Log")
        frappe.db.delete(table, filters=(table.creation < (Now() - Interval(days=days))))
