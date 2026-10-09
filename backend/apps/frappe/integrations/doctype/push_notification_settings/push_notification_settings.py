import frappe
from frappe import _
from frappe.model.document import Document


class PushNotificationSettings(Document):
    doctype = 'Push Notification Settings'

    _DOCTYPE_NAME = "Push Notification Settings"


    def validate(self):
        self.validate_relay_server_setup()

    def validate_relay_server_setup(self):
        if self.enable_push_notification_relay and not frappe.conf.get("push_relay_server_url"):
            frappe.throw(
                _("The Push Relay Server URL key (`push_relay_server_url`) is missing in your site config"),
                title=_("Relay Server URL missing"),
            )
