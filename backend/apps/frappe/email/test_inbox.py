import frappe
from frappe.email.inbox import create_email_flag_queue
from frappe.tests import IntegrationTestCase


class TestInbox(IntegrationTestCase):
    def test_create_email_flag_queue_accepts_native_list(self):
        comm = frappe.get_doc(
            doctype="Communication",
            communication_type="Communication",
            content="test inbox flag",
            subject="test inbox flag",
            sent_or_received="Received",
        ).insert(ignore_permissions=True)

        create_email_flag_queue([comm.name], "Read")
        comm.delete()
