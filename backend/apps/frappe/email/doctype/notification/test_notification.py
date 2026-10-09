import json
from contextlib import contextmanager

import frappe
import frappe.utils
import frappe.utils.scheduler
from frappe.desk.form import assign_to
from frappe.tests import IntegrationTestCase

from .notification import get_comments_for_context, trigger_notifications

EXTRA_TEST_RECORD_DEPENDENCIES = ["User", "Notification"]


@contextmanager
def get_test_notification(config):
    try:
        notification = frappe.get_doc(doctype="Notification", **config).insert()
        yield notification
    finally:
        notification.delete()
        frappe.db.commit()


@contextmanager
def get_test_doctype_with_attach_field(doctype_name="Test Attach Doctype"):
    """Create a temporary doctype with an attach field for testing."""
    try:
        if not frappe.db.exists("DocType", doctype_name):
            frappe.get_doc(
                {
                    "doctype": "DocType",
                    "name": doctype_name,
                    "module": "Core",
                    "custom": 1,
                    "fields": [
                        {"label": "Title", "fieldname": "title", "fieldtype": "Data", "reqd": 1},
                        {"label": "Attachment", "fieldname": "attachment", "fieldtype": "Attach"},
                    ],
                    "permissions": [
                        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}
                    ],
                }
            ).insert()

        yield doctype_name

    finally:
        frappe.db.delete(doctype_name)
        frappe.delete_doc_if_exists("DocType", doctype_name, force=1)
        frappe.db.commit()


@contextmanager
def create_test_file(file_name="test_attachment.txt", content="Test file content"):
    """Create a test file and return its File document."""
    try:
        file_doc = frappe.get_doc(
            {"doctype": "File", "file_name": file_name, "content": content, "is_private": 0}
        ).insert()

        yield file_doc

    finally:
        frappe.delete_doc_if_exists("File", file_doc.name, force=1)
        frappe.db.commit()


class TestNotification(IntegrationTestCase):
    def setUp(self):
        frappe.db.delete("Email Queue")
        frappe.set_user("test@example.com")

        if not frappe.db.exists("Notification", {"name": "ToDo Status Update"}, "name"):
            notification = frappe.new_doc("Notification")
            notification.name = "ToDo Status Update"
            notification.subject = "ToDo Status Update"
            notification.document_type = "ToDo"
            notification.event = "Value Change"
            notification.value_changed = "status"
            notification.send_to_all_assignees = 1
            notification.set_property_after_alert = "description"
            notification.property_value = "Changed by Notification"
            notification.save()

        if not frappe.db.exists("Notification", {"name": "Contact Status Update"}, "name"):
            notification = frappe.new_doc("Notification")
            notification.name = "Contact Status Update"
            notification.subject = "Contact Status Update"
            notification.document_type = "Contact"
            notification.event = "Value Change"
            notification.value_changed = "status"
            notification.message = "Test Contact Update"
            notification.append("recipients", {"receiver_by_document_field": "email_id,email_ids"})
            notification.save()

    def tearDown(self):
        frappe.set_user("Administrator")

    def test_new_and_save(self):
        """Check creating a new communication triggers a notification."""
        communication = frappe.new_doc("Communication")
        communication.communication_type = "Communication"
        communication.sender_full_name = "__test_notification_sender__"
        communication.subject = "test"
        communication.content = "test"
        communication.insert(ignore_permissions=True)

        self.assertTrue(
            frappe.db.get_value(
                "Email Queue",
                {
                    "reference_doctype": "Communication",
                    "reference_name": communication.name,
                    "status": "Not Sent",
                },
            )
        )
        frappe.db.delete("Email Queue")

        communication.reload()
        communication.content = "test 2"
        communication.save()

        self.assertTrue(
            frappe.db.get_value(
                "Email Queue",
                {
                    "reference_doctype": "Communication",
                    "reference_name": communication.name,
                    "status": "Not Sent",
                },
            )
        )

        self.assertEqual(frappe.db.get_value("Communication", communication.name, "subject"), "__testing__")

    def test_comments_in_context(self):
        todo = frappe.get_doc(doctype="ToDo", description="comments context").insert()
        self.assertIsNone(get_comments_for_context(todo))

        comment = todo.add_comment("Comment", "hello")
        email = frappe.get_doc(
            doctype="Communication",
            content="reply",
            sender="a@example.com",
            reference_doctype="ToDo",
            reference_name=todo.name,
        ).insert()
        self.assertEqual(
            get_comments_for_context(todo),
            [
                {"comment": "hello", "by": comment.comment_email, "name": comment.name},
                {"comment": "reply", "by": "a@example.com", "name": email.name},
            ],
        )

        todo.add_comment("Comment", "x" * 150)
        self.assertEqual(get_comments_for_context(todo)[-1]["comment"], "x" * 97 + "...")

    def test_condition(self):
        """Check notification is triggered based on a condition."""
        event = frappe.new_doc("Event")
        event.subject = "test"
        event.event_type = "Private"
        event.starts_on = "2014-06-06 12:00:00"
        event.insert()

        self.assertFalse(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        event.event_type = "Public"
        event.save()

        self.assertTrue(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        self.assertTrue(
            frappe.db.get_value(
                "Communication",
                {
                    "reference_doctype": "Event",
                    "reference_name": event.name,
                    "communication_type": "Automated Message",
                },
            )
        )

    def test_invalid_condition(self):
        frappe.set_user("Administrator")
        notification = frappe.new_doc("Notification")
        notification.subject = "test"
        notification.document_type = "ToDo"
        notification.send_alert_on = "New"
        notification.message = "test"

        recipent = frappe.new_doc("Notification Recipient")
        recipent.receiver_by_document_field = "owner"

        notification.recipents = recipent
        notification.condition = "test"

        self.assertRaises(frappe.ValidationError, notification.save)
        notification.delete()

    def test_value_changed(self):
        event = frappe.new_doc("Event")
        event.subject = "test"
        event.event_type = "Private"
        event.starts_on = "2014-06-06 12:00:00"
        event.insert()

        self.assertFalse(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        event.subject = "test 1"
        event.save()

        self.assertFalse(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        event.description = "test"
        event.save()

        self.assertTrue(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

    def test_minutes_positive_offset(self):
        from frappe.utils import add_to_date, now_datetime

        event = frappe.new_doc("Event")
        event.subject = "Test Minutes Positive Offset Event"
        event.event_type = "Private"
        event.starts_on = add_to_date(now_datetime(), minutes=14)
        event.insert()

        notification = {
            "name": "Test Minutes Positive Offset",
            "subject": "Test Minutes Positive Offset",
            "document_type": "Event",
            "event": "Minutes Before",
            "datetime_changed": "starts_on",
            "minutes_offset": 15,
            "message": "Test message",
            "channel": "System Notification",
            "recipients": [{"receiver_by_document_field": "owner"}],
        }

        with get_test_notification(notification) as n:
            frappe.db.delete("Notification Log", {"subject": n.subject})
            trigger_notifications(None, "offset")

            self.assertEqual(1, frappe.db.count("Notification Log", {"subject": n.subject}))

    def test_system_notification_sets_app_from_module(self):
        """A System Notification rule records its owning app (from `module`) on the log."""
        from frappe.utils import add_to_date, now_datetime

        event = frappe.new_doc("Event")
        event.subject = "Test App From Module Event"
        event.event_type = "Private"
        event.starts_on = add_to_date(now_datetime(), minutes=14)
        event.insert()

        notification = {
            "name": "Test App From Module",
            "subject": "Test App From Module",
            "document_type": "Event",
            "module": "Core",
            "event": "Minutes Before",
            "datetime_changed": "starts_on",
            "minutes_offset": 15,
            "channel": "System Notification",
            "notification_type": "Alert",
            "recipients": [{"receiver_by_document_field": "owner"}],
        }

        with get_test_notification(notification) as n:
            frappe.db.delete("Notification Log", {"title": n.subject})
            trigger_notifications(None, "offset")
            app = frappe.db.get_value("Notification Log", {"title": n.subject}, "app")
            self.assertEqual(app, "frappe")

    def test_minutes_negative_offset(self):
        from frappe.utils import add_to_date, now_datetime

        event = frappe.new_doc("Event")
        event.subject = "Test Minutes Negative Offset Event"
        event.event_type = "Private"
        event.starts_on = add_to_date(now_datetime(), minutes=-16)
        event.insert()

        notification = {
            "name": "Test Minutes Negative Offset",
            "subject": "Test Minutes Negative Offset",
            "document_type": "Event",
            "event": "Minutes After",
            "datetime_changed": "starts_on",
            "minutes_offset": 15,
            "message": "Test message",
            "channel": "System Notification",
            "recipients": [{"receiver_by_document_field": "owner"}],
        }

        with get_test_notification(notification) as n:
            frappe.db.delete("Notification Log", {"subject": n.subject})
            trigger_notifications(None, "offset")

            self.assertEqual(1, frappe.db.count("Notification Log", {"subject": n.subject}))

    def test_minutes_offset_validation(self):
        notification = frappe.new_doc("Notification")
        notification.name = "Test Minutes Offset Validation"
        notification.subject = "Test Minutes Offset Validation"
        notification.document_type = "Event"
        notification.event = "Minutes Before"
        notification.datetime_changed = "starts_on"
        notification.message = "Test message"

        notification.minutes_offset = -5
        self.assertRaises(frappe.ValidationError, notification.insert)

        notification.minutes_offset = 0
        self.assertRaises(frappe.ValidationError, notification.insert)

        notification.minutes_offset = 5
        self.assertRaises(frappe.ValidationError, notification.insert)

        notification.minutes_offset = 15
        notification.insert()
        notification.delete()

    def test_alert_disabled_on_wrong_field(self):
        frappe.set_user("Administrator")
        notification = frappe.get_doc(
            {
                "doctype": "Notification",
                "subject": "_Test Notification for wrong field",
                "document_type": "Event",
                "event": "Value Change",
                "attach_print": 0,
                "value_changed": "description1",
                "message": "Description changed",
                "recipients": [{"receiver_by_document_field": "owner"}],
            }
        ).insert()
        frappe.db.commit()

        event = frappe.new_doc("Event")
        event.subject = "test-2"
        event.event_type = "Private"
        event.starts_on = "2014-06-06 12:00:00"
        event.insert()
        event.subject = "test 1"
        event.save()

        notification.reload()
        self.assertEqual(notification.enabled, 0)
        notification.delete()
        event.delete()

    def test_date_changed(self):
        event = frappe.new_doc("Event")
        event.subject = "test"
        event.event_type = "Private"
        event.starts_on = "2014-01-01 12:00:00"
        event.insert()

        self.assertFalse(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        frappe.set_user("Administrator")
        frappe.get_doc(
            "Scheduled Job Type",
            dict(method="frappe.email.doctype.notification.notification.trigger_daily_alerts"),
        ).execute()

        self.assertFalse(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        event.starts_on = frappe.utils.add_days(frappe.utils.nowdate(), 2) + " 12:00:00"
        event.save()

        self.assertFalse(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

        frappe.get_doc(
            "Scheduled Job Type",
            dict(method="frappe.email.doctype.notification.notification.trigger_daily_alerts"),
        ).execute()

        self.assertTrue(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "Event", "reference_name": event.name, "status": "Not Sent"},
            )
        )

    def test_cc_jinja(self):
        frappe.db.delete("User", {"email": "test_jinja@example.com"})
        frappe.db.delete("Email Queue")
        frappe.db.delete("Email Queue Recipient")

        test_user = frappe.new_doc("User")
        test_user.name = "test_jinja"
        test_user.first_name = "test_jinja"
        test_user.email = "test_jinja@example.com"

        test_user.insert(ignore_permissions=True)

        self.assertTrue(
            frappe.db.get_value(
                "Email Queue",
                {"reference_doctype": "User", "reference_name": test_user.name, "status": "Not Sent"},
            )
        )

        self.assertTrue(frappe.db.get_value("Email Queue Recipient", {"recipient": "test_jinja@example.com"}))

        frappe.db.delete("User", {"email": "test_jinja@example.com"})
        frappe.db.delete("Email Queue")
        frappe.db.delete("Email Queue Recipient")

    def test_notification_to_assignee(self):
        todo = frappe.new_doc("ToDo")
        todo.description = "Test Notification"
        todo.save()

        assign_to.add(
            {
                "assign_to": ["test2@example.com"],
                "doctype": todo.doctype,
                "name": todo.name,
                "description": "Close this Todo",
            }
        )

        assign_to.add(
            {
                "assign_to": ["test1@example.com"],
                "doctype": todo.doctype,
                "name": todo.name,
                "description": "Close this Todo",
            }
        )

        todo.status = "Closed"
        todo.save()

        email_queue = frappe.get_doc(
            "Email Queue", {"reference_doctype": "ToDo", "reference_name": todo.name}
        )

        self.assertTrue(email_queue)

        self.assertEqual(todo.description, "Changed by Notification")

        recipients = [d.recipient for d in email_queue.recipients]
        self.assertTrue("test2@example.com" in recipients)
        self.assertTrue("test1@example.com" in recipients)

    def test_notification_by_child_table_field(self):
        contact = frappe.new_doc("Contact")
        contact.first_name = "John Doe"
        contact.status = "Open"
        contact.append("email_ids", {"email_id": "test2@example.com", "is_primary": 1})

        contact.append("email_ids", {"email_id": "test1@example.com"})

        contact.save()

        contact.status = "Replied"
        contact.save()

        email_queue = frappe.get_doc(
            "Email Queue", {"reference_doctype": "Contact", "reference_name": contact.name}
        )

        self.assertTrue(email_queue)

        recipients = [d.recipient for d in email_queue.recipients]
        self.assertTrue("test2@example.com" in recipients)
        self.assertTrue("test1@example.com" in recipients)

    def test_notification_value_change_casted_types(self):
        """Make sure value change event dont fire because of incorrect type comparisons."""
        frappe.set_user("Administrator")

        notification = {
            "document_type": "User",
            "subject": "User changed birthdate",
            "event": "Value Change",
            "channel": "System Notification",
            "value_changed": "birth_date",
            "recipients": [{"receiver_by_document_field": "email"}],
        }

        with get_test_notification(notification) as n:
            frappe.db.delete("Notification Log", {"subject": n.subject})

            user = frappe.get_doc("User", "test@example.com")
            user.birth_date = frappe.utils.add_days(user.birth_date, 1).date()
            user.save()

            user.reload()
            user.birth_date = frappe.utils.getdate(user.birth_date)
            user.save()
            self.assertEqual(1, frappe.db.count("Notification Log", {"subject": n.subject}))

    def test_attach_files_from_field(self):
        """Test notification with 'From Field' attachment option."""
        frappe.db.delete("Email Queue")

        with get_test_doctype_with_attach_field("Test From Field Doctype") as test_doctype:
            with create_test_file("from_field_test.txt", "Content from specific field") as test_file:
                notification_config = {
                    "name": "Test From Field Attachment",
                    "subject": "Test From Field Attachment",
                    "document_type": test_doctype,
                    "event": "Save",
                    "message": "Document saved with attachment",
                    "channel": "Email",
                    "attach_files": "From Field",
                    "from_attach_field": "attachment",
                    "recipients": [{"receiver_by_document_field": "owner"}],
                }

                with get_test_notification(notification_config):
                    test_doc = frappe.get_doc(
                        {
                            "doctype": test_doctype,
                            "title": "Test Document with Attachment",
                            "attachment": test_file.file_url,
                        }
                    ).insert()

                    test_doc.save()

                    email_queue = frappe.get_doc(
                        "Email Queue", {"reference_doctype": test_doctype, "reference_name": test_doc.name}
                    )

                    self.assertTrue(email_queue, "Email Queue not created")

                    attachments = json.loads(email_queue.attachments) if email_queue.attachments else []
                    self.assertEqual(len(attachments), 1, "Expected exactly one attachment")
                    self.assertEqual(
                        attachments[0].get("file_url"), test_file.file_url, "Attachment URL doesn't match"
                    )

                    test_doc.delete()

    def test_attach_files_all(self):
        """Test notification with 'All' attachment option."""
        frappe.db.delete("Email Queue")

        with get_test_doctype_with_attach_field("Test All Attachments Doctype") as test_doctype:
            with create_test_file("all_test_1.txt", "First file content") as test_file1:
                notification_config = {
                    "name": "Test All Attachments",
                    "subject": "Test All Attachments",
                    "document_type": test_doctype,
                    "event": "Save",
                    "message": "Document saved with all attachments",
                    "channel": "Email",
                    "attach_files": "All",
                    "recipients": [{"receiver_by_document_field": "owner"}],
                }

                with get_test_notification(notification_config):
                    test_doc = frappe.get_doc(
                        {
                            "doctype": test_doctype,
                            "title": "Test Document with Multiple Attachments",
                            "attachment": test_file1.file_url,
                        }
                    ).insert()

                    with create_test_file(
                        "additional_file.txt", "Additional file content"
                    ) as additional_file:
                        additional_file.attached_to_doctype = test_doctype
                        additional_file.attached_to_name = test_doc.name
                        additional_file.save()

                        test_doc.save()

                        email_queue = frappe.get_doc(
                            "Email Queue",
                            {"reference_doctype": test_doctype, "reference_name": test_doc.name},
                        )

                        self.assertTrue(email_queue, "Email Queue not created")

                        attachments = json.loads(email_queue.attachments) if email_queue.attachments else []

                        self.assertEqual(len(attachments), 2, "Expected exactly two attachments")

                        attachment_urls = [att.get("file_url") for att in attachments]
                        self.assertIn(
                            test_file1.file_url, attachment_urls, "First file not found in attachments"
                        )
                        self.assertIn(
                            additional_file.file_url,
                            attachment_urls,
                            "Additional file not found in attachments",
                        )

                    test_doc.delete()

    def test_attach_files_empty_option(self):
        """Test notification with empty attachment option (no attachments)."""
        frappe.db.delete("Email Queue")

        notification_config = {
            "name": "Test No Attachments",
            "subject": "Test No Attachments",
            "document_type": "ToDo",
            "event": "Save",
            "message": "Todo saved without attachments",
            "channel": "Email",
            "attach_print": 0,
            "attach_files": "",
            "recipients": [{"receiver_by_document_field": "owner"}],
        }

        with get_test_notification(notification_config):
            todo = frappe.new_doc("ToDo")
            todo.description = "Test ToDo"
            todo.insert()
            todo.save()

            email_queue = frappe.get_doc(
                "Email Queue", {"reference_doctype": "ToDo", "reference_name": todo.name}
            )

            self.assertTrue(email_queue, "Email Queue not created")

            attachments = json.loads(email_queue.attachments) if email_queue.attachments else []
            self.assertEqual(len(attachments), 0, "Expected no attachments")

            todo.delete(ignore_permissions=True)

    @classmethod
    def tearDownClass(cls):
        frappe.delete_doc_if_exists("Notification", "ToDo Status Update")
        frappe.delete_doc_if_exists("Notification", "Contact Status Update")

    def test_notification_with_jinja_template(self):
        """Test Notification with Jinja Template"""
        notification = frappe.get_doc(
            {
                "doctype": "Notification",
                "name": "Notification with Jinja Template",
                "subject": "{{ doc.name }}",
                "document_type": "ToDo",
                "event": "Save",
                "condition": "doc.status == 'Open'",
                "message": "{% set val = frappe.get_doc('ToDo', doc.name) %} ToDo allocated to {{ doc.allocated_to }}",
                "channel": "Email",
                "recipients": [{"receiver_by_document_field": "allocated_to"}],
            }
        ).insert()

        todo = frappe.new_doc("ToDo")
        todo.description = "Checking email notification with jinja template"
        todo.allocated_to = "test1@example.com"
        todo.save()

        email_queue = frappe.get_doc(
            "Email Queue", {"reference_doctype": "ToDo", "reference_name": todo.name}
        )
        self.assertTrue(email_queue)

        recipients = [d.recipient for d in email_queue.recipients]
        self.assertTrue("test1@example.com" in recipients)
        self.assertEqual(notification.enabled, 1)

    def test_filters_condition(self):
        """Test Notification with Condition Type 'Filters'."""
        frappe.delete_doc_if_exists("Notification", "Test Filters Condition")

        notification = frappe.new_doc("Notification")
        notification.name = "Test Filters Condition"
        notification.subject = "Test Filters Condition"
        notification.document_type = "ToDo"
        notification.event = "Save"
        notification.condition_type = "Filters"
        notification.filters = json.dumps([["status", "=", "Open"]])
        notification.message = "Test message"
        notification.channel = "Email"
        notification.append("recipients", {"receiver_by_document_field": "allocated_to"})
        notification.save()

        todo = frappe.new_doc("ToDo")
        todo.description = "Checking email notification with filters condition"
        todo.allocated_to = "test1@example.com"
        todo.save()

        email_queue = frappe.get_doc(
            "Email Queue", {"reference_doctype": "ToDo", "reference_name": todo.name}
        )
        self.assertTrue(email_queue)

        recipients = [d.recipient for d in email_queue.recipients]
        self.assertTrue("test1@example.com" in recipients)
        self.assertEqual(notification.enabled, 1)

    def test_email_template_content_for_email_and_system_notification(self):
        """email_template should drive content for both the Email channel and the bell (Send System Notification)."""
        frappe.delete_doc_if_exists("Email Template", "Test ToDo Email Template")
        email_template = frappe.get_doc(
            {
                "doctype": "Email Template",
                "name": "Test ToDo Email Template",
                "subject": "ToDo update: {{ description }}",
                "response": "<p>Status is now {{ status }}, no doc. prefix needed.</p>",
            }
        ).insert()

        frappe.delete_doc_if_exists("Notification", "Test Email Template Notification")
        notification = frappe.get_doc(
            {
                "doctype": "Notification",
                "name": "Test Email Template Notification",
                "document_type": "ToDo",
                "event": "Save",
                "channel": "Email",
                "email_template": email_template.name,
                "send_system_notification": 1,
                "recipients": [{"receiver_by_document_field": "owner"}],
            }
        ).insert()

        frappe.db.delete("Notification Log", {"subject": ["like", "ToDo update:%"]})

        todo = frappe.new_doc("ToDo")
        todo.description = "Checking email template content"
        todo.status = "Open"
        todo.save()

        email_queue = frappe.get_doc(
            "Email Queue", {"reference_doctype": "ToDo", "reference_name": todo.name}
        )
        self.assertIn("Checking email template content", email_queue.message)
        self.assertIn("Status is now Open", email_queue.message)

        notification_log = frappe.get_doc(
            "Notification Log", {"subject": ["like", "ToDo update:%"], "for_user": frappe.session.user}
        )
        self.assertIn("Checking email template content", notification_log.subject)
        self.assertIn("Status is now Open", notification_log.email_content)

        todo.delete(ignore_permissions=True)
        notification.delete()
        email_template.delete()

    def test_email_template_with_no_content_is_rejected_on_save(self):
        """A Notification pointing at an empty Email Template should fail at save, not silently fall back."""
        frappe.delete_doc_if_exists("Email Template", "Test Empty Email Template")
        email_template = frappe.get_doc(
            {
                "doctype": "Email Template",
                "name": "Test Empty Email Template",
                "subject": "x",
                "response": "",
            }
        ).insert()

        notification = frappe.new_doc("Notification")
        notification.document_type = "ToDo"
        notification.event = "Save"
        notification.channel = "Email"
        notification.email_template = email_template.name
        notification.append("recipients", {"receiver_by_document_field": "owner"})

        self.assertRaises(frappe.ValidationError, notification.insert)

        email_template.delete()

    def test_email_template_rejected_for_non_email_channel(self):
        """email_template is only meaningful for the Email channel and should be rejected elsewhere."""
        frappe.delete_doc_if_exists("Email Template", "Test ToDo Email Template Channel")
        email_template = frappe.get_doc(
            {
                "doctype": "Email Template",
                "name": "Test ToDo Email Template Channel",
                "subject": "x",
                "response": "y",
            }
        ).insert()

        notification = frappe.new_doc("Notification")
        notification.document_type = "ToDo"
        notification.event = "Save"
        notification.channel = "System Notification"
        notification.email_template = email_template.name
        notification.append("recipients", {"receiver_by_document_field": "owner"})

        self.assertRaises(frappe.ValidationError, notification.insert)

        email_template.delete()


"""
PROOF OF TEST for TestNotificationOffsetRange below.

On CI there are uncontrollable side effects which force the commenting out of this test.

❯ bench run-tests --module frappe.email.doctype.notification.test_notification --case TestNotificationOffsetRange
/nix/store/la0hqc6s2n2rd50b5sn13m33av6jx9zl-python3-3.11.9-env/lib/python3.11/site-packages/passlib/utils/__init__.py:854: DeprecationWarning: 'crypt' is deprecated and slated for removal in Python 3.13
  from crypt import crypt as _crypt
Updating Dashboard for frappe
/nix/store/la0hqc6s2n2rd50b5sn13m33av6jx9zl-python3-3.11.9-env/lib/python3.11/site-packages/cssutils/_fetchgae.py:6: DeprecationWarning: 'cgi' is deprecated and slated for removal in Python 3.13
  import cgi
...
----------------------------------------------------------------------
Ran 3 tests in 2.677s

OK
"""
