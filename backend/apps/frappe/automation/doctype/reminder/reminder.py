
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint
from frappe.utils.data import add_to_date, get_datetime, now_datetime


class Reminder(Document):
    _DOCTYPE_NAME = "Reminder"


    @staticmethod
    def clear_old_logs(days=30):
        from frappe.query_builder import Interval
        from frappe.query_builder.functions import Now

        table = frappe.qb.DocType("Reminder")
        frappe.db.delete(table, filters=(table.remind_at < (Now() - Interval(days=days))))

    def validate(self):
        self.user = frappe.session.user
        if get_datetime(self.remind_at) < now_datetime():
            frappe.throw(_("Reminder cannot be created in past."))

    def send_reminder(self):
        if self.notified:
            return

        self.db_set("notified", 1, update_modified=False)

        try:
            notification = frappe.new_doc("Notification Log")
            notification.for_user = self.user
            notification.set("type", "Alert")
            notification.document_type = self.reminder_doctype
            notification.document_name = self.reminder_docname
            notification.subject = self.description
            notification.insert()
        except Exception:
            self.log_error("Failed to send reminder")


@frappe.whitelist()
def create_new_reminder(
    remind_at: str,
    description: str,
    reminder_doctype: str | None = None,
    reminder_docname: str | None = None,
):
    reminder = frappe.new_doc("Reminder")

    reminder.description = description
    reminder.remind_at = remind_at
    reminder.reminder_doctype = reminder_doctype
    reminder.reminder_docname = reminder_docname

    return reminder.insert()


def send_reminders():
    job_freq = 15 * 60
    upper_threshold = add_to_date(now_datetime(), seconds=job_freq, as_string=True, as_datetime=True)
    lower_threshold = add_to_date(now_datetime(), hours=-1, as_string=True, as_datetime=True)

    pending_reminders = frappe.get_all(
        "Reminder",
        filters=[
            ("remind_at", "<=", upper_threshold),
            ("remind_at", ">=", lower_threshold),
            ("notified", "=", 0),
        ],
        pluck="name",
        ignore_ifnull=True,
    )

    for reminder in pending_reminders:
        frappe.get_doc("Reminder", reminder).send_reminder()
