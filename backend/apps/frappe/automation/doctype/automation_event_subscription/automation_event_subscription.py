import hashlib

import frappe
from frappe.model.document import Document


class AutomationEventSubscription(Document):
    doctype = 'Automation Event Subscription'

    def autoname(self):
        value = f"{self.run}:{self.step_key}"
        self.name = hashlib.sha256(value.encode()).hexdigest()


def on_doctype_update():
    frappe.db.add_index(
        "Automation Event Subscription",
        ["event_name", "correlation_key", "status"],
        index_name="event_correlation_status",
    )
    frappe.db.add_index(
        "Automation Event Subscription",
        ["status", "expires_at"],
        index_name="event_expiry_status",
    )
