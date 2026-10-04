import frappe
from frappe.model.document import Document


class NotificationSettings(Document):
    _DOCTYPE_NAME = "Notification Settings"


    def on_update(self):
        from frappe.desk.notifications import clear_notification_config

        clear_notification_config(frappe.session.user)


def is_notifications_enabled(user):
    enabled = frappe.db.get_value("Notification Settings", user, "enabled")
    if enabled is None:
        return True
    return enabled


def is_email_notifications_enabled(user):
    enabled = frappe.db.get_value("Notification Settings", user, "enable_email_notifications")
    if enabled is None:
        return True
    return enabled


def is_email_enabled_for_feature(user, fieldname):
    """Per-feature email toggle (e.g. event reminders, thread emails on assigned docs).

    These are NOT Notification Types — they gate emails for features that have no in-app
    notification, so they keep their own Notification Settings checkbox instead of the
    `email_notification_types` allow-list. Permissive default (True) when unset, mirroring
    the original behaviour before the allow-list was introduced.
    """
    if not is_email_notifications_enabled(user):
        return False

    enabled = frappe.db.get_value("Notification Settings", user, fieldname, ignore=True)
    return True if enabled is None else enabled


def is_email_notifications_enabled_for_type(user, notification_type):
    """Whether `user` should be emailed for a given registered Notification Type.

    `notification_type` must be a `Notification Type` name (e.g. "Mention"). For per-feature
    email toggles that are not Notification Types (event reminders, thread emails), use
    `is_email_enabled_for_feature` instead — they are not in the allow-list table and would
    always read as disabled here.
    """
    from frappe.desk.doctype.notification_log.notification_log import get_skip_email_types

    if not is_email_notifications_enabled(user):
        return False

    if notification_type in get_skip_email_types():
        return False

    try:
        settings = frappe.get_cached_doc("Notification Settings", user)
    except frappe.DoesNotExistError:
        frappe.clear_last_message()
        return True

    return any(row.notification_type == notification_type for row in settings.email_notification_types)


def create_notification_settings(user):
    if not frappe.db.exists("Notification Settings", user):
        _doc = frappe.new_doc("Notification Settings")
        _doc.name = user
        for notification_type in get_default_email_notification_types():
            _doc.append("email_notification_types", {"notification_type": notification_type})
        _doc.insert(ignore_permissions=True)


def get_default_email_notification_types() -> list[str]:
    """Notification Types a new user gets emails for by default (opt-out model).

    All enabled types except those that never email (e.g. "Alert").
    """
    from frappe.desk.doctype.notification_log.notification_log import get_skip_email_types

    skip = get_skip_email_types()
    return [
        name
        for name in frappe.get_all("Notification Type", filters={"enabled": 1}, pluck="name")
        if name not in skip
    ]


@frappe.whitelist()
def get_emailable_notification_types() -> list[str]:
    """All enabled Notification Types, used to render the email-types checkbox grid."""
    return frappe.get_all("Notification Type", filters={"enabled": 1}, pluck="name")


def toggle_notifications(user: str, enable: bool = False, ignore_permissions=False):
    try:
        settings = frappe.get_doc("Notification Settings", user)
    except frappe.DoesNotExistError:
        frappe.clear_last_message()
        return

    if settings.enabled != enable:
        settings.enabled = enable
        settings.save(ignore_permissions=ignore_permissions)


@frappe.whitelist()
def get_subscribed_documents():
    if not frappe.session.user:
        return []

    try:
        if frappe.db.exists("Notification Settings", frappe.session.user):
            doc = frappe.get_doc("Notification Settings", frappe.session.user)
            return [item.document for item in doc.subscribed_documents]
    except ImportError:
        pass

    return []


def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user

    if user == "Administrator":
        return

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return """(`tabNotification Settings`.name != 'Administrator')"""

    return f"""(`tabNotification Settings`.name = {frappe.db.escape(user)})"""


def has_permission(doc, ptype="read", user=None):
    user = user or frappe.session.user

    if user == "Administrator":
        return True

    if "System Manager" in frappe.get_roles(user):
        return doc.name != "Administrator"

    return doc.name == user


@frappe.whitelist()
def set_seen_value(value: int, user: str):
    if frappe.flags.read_only:
        return

    frappe.db.set_value("Notification Settings", frappe.session.user, "seen", value, update_modified=False)
