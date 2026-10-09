import frappe
from frappe.desk.doctype.notification_settings.notification_settings import (
    is_email_enabled_for_feature,
)
from frappe.tests import IntegrationTestCase

FEATURE_FIELD = "enable_email_event_reminders"


class TestNotificationSettings(IntegrationTestCase):
    def setUp(self):
        self.user = "test_notification_feature@example.com"
        if not frappe.db.exists("User", self.user):
            frappe.get_doc(
                {
                    "doctype": "User",
                    "email": self.user,
                    "first_name": "Notification Feature",
                }
            ).insert(ignore_permissions=True)

        settings = frappe.get_doc("Notification Settings", self.user)
        settings.enable_email_notifications = 1
        settings.save(ignore_permissions=True)

    def _set_feature(self, value):
        frappe.db.set_value("Notification Settings", self.user, FEATURE_FIELD, value)
        frappe.clear_document_cache("Notification Settings", self.user)

    def test_permissive_default_when_field_absent(self):
        self.assertTrue(is_email_enabled_for_feature(self.user, "enable_email_nonexistent_toggle"))

    def test_feature_enabled_when_checked(self):
        self._set_feature(1)
        self.assertTrue(is_email_enabled_for_feature(self.user, FEATURE_FIELD))

    def test_feature_disabled_when_unchecked(self):
        self._set_feature(0)
        self.assertFalse(is_email_enabled_for_feature(self.user, FEATURE_FIELD))

    def test_feature_off_when_email_globally_disabled(self):
        self._set_feature(1)
        frappe.db.set_value("Notification Settings", self.user, "enable_email_notifications", 0)
        frappe.clear_document_cache("Notification Settings", self.user)
        self.assertFalse(is_email_enabled_for_feature(self.user, FEATURE_FIELD))
