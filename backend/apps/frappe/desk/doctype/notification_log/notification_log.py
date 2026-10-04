from __future__ import annotations

import frappe
from frappe import _
from frappe.desk.doctype.notification_settings.notification_settings import (
    is_email_notifications_enabled_for_type,
    is_notifications_enabled,
)
from frappe.model.document import Document
from frappe.utils.caching import http_cache


class NotificationLog(Document):
    doctype = 'Notification Log'

    _DOCTYPE_NAME = "Notification Log"


    def before_insert(self):
        if not self.title and self.subject:
            self.title = self.subject
        if not self.subject and self.title:
            self.subject = self.title
        if not self.description and self.email_content:
            self.description = self.email_content
        if not self.email_content and self.description:
            self.email_content = self.description

        if not self.app and self.document_type:
            self.app = _resolve_app_for_doctype(self.document_type)

    def after_insert(self):
        frappe.publish_realtime("notification", after_commit=True, user=self.for_user)
        set_notifications_as_unseen(self.for_user)
        if is_email_notifications_enabled_for_type(self.for_user, self.type):
            try:
                send_notification_email(self)
            except frappe.OutgoingEmailError:
                self.log_error(_("Failed to send notification email"))

    @staticmethod
    def clear_old_logs(days=180):
        from frappe.query_builder import Interval
        from frappe.query_builder.functions import Now

        table = frappe.qb.DocType("Notification Log")
        frappe.db.delete(table, filters=(table.creation < (Now() - Interval(days=days))))


def _resolve_app_for_doctype(doctype: str) -> str | None:
    """Owning app of `doctype`, or None if it can't be resolved (deleted/stale/custom doctype).

    Uses the cached get_doctype_module + get_module_app rather than building the whole
    get_doctype_app_map() on every insert.
    """
    from frappe.modules.utils import get_doctype_module, get_module_app

    try:
        return get_module_app(get_doctype_module(doctype))
    except frappe.DoesNotExistError:
        frappe.clear_last_message()
        return None


def get_skip_email_types() -> set[str]:
    """Notification Types whose log should not additionally send its own email."""
    return set(frappe.get_hooks("notification_skip_email_types") or [])


def get_self_notify_types() -> set[str]:
    """Notification Types delivered even when the recipient is also the actor."""
    return set(frappe.get_hooks("notification_self_notify_types") or [])


def get_permission_query_conditions(for_user):
    if not for_user:
        for_user = frappe.session.user

    if for_user == "Administrator":
        return

    return f"""(`tabNotification Log`.for_user = {frappe.db.escape(for_user)})"""


def has_permission(doc, ptype="read", user=None):
    user = user or frappe.session.user

    return user == "Administrator" or doc.for_user == user


def get_title(doctype, docname, title_field=None):
    if not title_field:
        title_field = frappe.get_meta(doctype).get_title_field()
    if title_field == "name":
        return docname
    return frappe.db.get_value(doctype, docname, title_field) or docname


def get_title_html(title):
    return f'<b class="subject-title">{title}</b>'


def enqueue_create_notification(users: list[str] | str, doc: dict, dedupe_on: list[str] | None = None):
    """Send notification to users.

    users: list of user emails or string of users with comma separated emails
    doc: contents of `Notification` doc
    dedupe_on: optional list of field names; for each recipient, skip creation if a
            Notification Log already exists matching those field values (prevents
            duplicate rows — it does not re-surface an existing notification)
    """

    if frappe.flags.in_install:
        return

    doc = frappe._dict(doc)
    if dedupe_on:
        doc.dedupe_on = dedupe_on

    if isinstance(users, str):
        users = [user.strip() for user in users.split(",") if user.strip()]
    users = list(set(users))

    frappe.enqueue(
        "frappe.desk.doctype.notification_log.notification_log.make_notification_logs",
        doc=doc,
        users=users,
        now=frappe.in_test,
        enqueue_after_commit=not frappe.in_test,
    )


def make_notification_logs(doc, users):
    dedupe_on = doc.pop("dedupe_on", None) if isinstance(doc, dict) else None
    self_notify_types = get_self_notify_types()

    for user in _get_user_ids(users):
        if dedupe_on and _notification_exists(doc, user, dedupe_on):
            continue

        notification = frappe.new_doc("Notification Log")
        notification.update(doc)
        notification.for_user = user
        if notification.for_user != notification.from_user or doc.type in self_notify_types:
            notification.insert(ignore_permissions=True)


def _notification_exists(doc, user, dedupe_on) -> bool:
    """Return True if a notification matching the given fields already exists for the user.

    `dedupe_on` is a list of field names; their values are taken from `doc`. This mirrors
    the existence checks the app-specific notification doctypes used to do (e.g. CRM's
    `frappe.db.exists(values)` and Press's `exists({document_name})`).
    """
    filters = {"for_user": user}
    for fieldname in dedupe_on:
        filters[fieldname] = doc.get(fieldname)
    return bool(frappe.db.exists("Notification Log", filters))


def _get_user_ids(user_emails):
    user_names = frappe.db.get_values(
        "User", {"enabled": 1, "email": ("in", user_emails)}, "name", pluck=True
    )
    return [user for user in user_names if is_notifications_enabled(user)]


def send_notification_email(doc: NotificationLog):
    from frappe.utils import get_url_to_form, strip_html

    user = frappe.db.get_value("User", doc.for_user, fieldname=["email", "language"], as_dict=True)
    if not user:
        return

    header = get_email_header(doc, user.language)
    email_subject = strip_html(doc.subject)
    args = {
        "body_content": doc.subject,
        "description": doc.email_content,
    }
    if doc.link:
        args["doc_link"] = doc.link
    elif doc.document_type and doc.document_name:
        args["document_type"] = doc.document_type
        args["document_name"] = doc.document_name
        args["doc_link"] = get_url_to_form(doc.document_type, doc.document_name)

    frappe.sendmail(
        recipients=user.email,
        subject=email_subject,
        template="new_notification",
        args=args,
        header=[header, "orange"],
        now=frappe.in_test,
    )


def get_email_header(doc, language: str | None = None):
    docname = doc.document_name
    header_map = {
        "Default": _("New Notification", lang=language),
        "Mention": _("New Mention on {0}", lang=language).format(docname),
        "Assignment": _("Assignment Update on {0}", lang=language).format(docname),
        "Share": _("New Document Shared {0}", lang=language).format(docname),
    }
    if not doc.email_header:
        doc.email_header = header_map.get(doc.type or "Default", header_map["Default"])
    return doc.email_header


def format_email_header(header_map, language, docname):
    messages = []
    for v in list(header_map.values()):
        messages.append(_(v[0], lang=language).format(docname))
    return dict(zip(header_map.keys(), messages, strict=True))


@frappe.whitelist()
@http_cache(max_age=60, stale_while_revalidate=60 * 60)
def get_notification_logs(limit: int = 20):
    notification_logs = frappe.db.get_list(
        "Notification Log", fields=["*"], limit=limit, order_by="creation desc"
    )

    users = [log.from_user for log in notification_logs]
    users = [*set(users)]
    user_info = frappe._dict()

    for user in users:
        frappe.utils.add_user_info(user, user_info)

    return {"notification_logs": notification_logs, "user_info": user_info}


@frappe.whitelist()
def mark_all_as_read():
    _mark_as_read({})


@frappe.whitelist()
def mark_as_read(docname: str):
    if docname:
        _mark_as_read({"name": str(docname)})


def _mark_as_read(filters: dict):
    if frappe.flags.read_only:
        return

    frappe.db.set_value(
        "Notification Log",
        {**filters, "for_user": frappe.session.user, "read": 0},
        "read",
        1,
        update_modified=False,
    )


@frappe.whitelist()
def trigger_indicator_hide():
    frappe.publish_realtime("indicator_hide", user=frappe.session.user)


def set_notifications_as_unseen(user):
    try:
        frappe.db.set_value("Notification Settings", user, "seen", 0, update_modified=False)
    except frappe.DoesNotExistError:
        return
