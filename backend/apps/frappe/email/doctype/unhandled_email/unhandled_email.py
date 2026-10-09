import frappe
from frappe.model.document import Document


class UnhandledEmail(Document):
    doctype = 'Unhandled Email'

    _DOCTYPE_NAME = "Unhandled Email"


    @staticmethod
    def clear_old_logs(days=30):
        frappe.db.delete(
            "Unhandled Email",
            {
                "creation": ("<", frappe.utils.add_days(frappe.utils.nowdate(), -1 * days)),
            },
        )
