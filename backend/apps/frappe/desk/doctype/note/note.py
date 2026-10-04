import frappe
from frappe.model.document import Document

UNSEEN_NOTES_KEY = "unseen_notes::"


class Note(Document):
    doctype = 'Note'

    _DOCTYPE_NAME = "Note"


    def validate(self):
        if self.notify_on_login and not self.expire_notification_on:
            self.expire_notification_on = frappe.utils.add_days(self.creation, 7)

        if not self.public and self.notify_on_login:
            self.notify_on_login = 0

        if not self.content:
            self.content = "<span></span>"
        self.content = frappe.utils.sanitize_html(self.content, always_sanitize=True)

    def before_print(self, settings=None):
        self.print_heading = self.name
        self.sub_heading = ""

    def clear_cache(self):
        frappe.cache.delete_keys(UNSEEN_NOTES_KEY)
        return super().clear_cache()

    def mark_seen_by(self, user: str) -> bool:
        if user in [d.user for d in self.seen_by]:
            return False

        self.append("seen_by", {"user": user})
        return True


@frappe.whitelist(methods=["POST"])
def mark_as_seen(note: str):
    note: Note = frappe.get_doc("Note", note)
    note.check_permission("read")
    current_user = frappe.session.user

    try:
        frappe.set_user("Administrator")
        added = note.mark_seen_by(current_user)
        if added:
            note.save(ignore_version=True)
    finally:
        frappe.set_user(current_user)


def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user

    return f"(`tabNote`.owner = {frappe.db.escape(user)} or `tabNote`.public = 1)"


def has_permission(doc, user):
    return bool(doc.public or doc.owner == user)


def get_unseen_notes():
    return (
        frappe.cache.get_value(
            f"{UNSEEN_NOTES_KEY}{frappe.session.user}",
        )
        or []
    )


@frappe.whitelist()
def reset_notes():
    frappe.cache.set_value(f"{UNSEEN_NOTES_KEY}{frappe.session.user}", [])
    return frappe.cache.get_value(f"{UNSEEN_NOTES_KEY}{frappe.session.user}")


def _get_unseen_notes():
    from frappe.query_builder.terms import ParameterizedValueWrapper, SubQuery

    note = frappe.qb.DocType("Note")
    nsb = frappe.qb.DocType("Note Seen By").as_("nsb")

    results = (
        frappe.qb.from_(note)
        .select(note.name, note.title, note.content, note.notify_on_every_login)
        .where(
            (note.notify_on_login == 1)
            & (note.expire_notification_on > frappe.utils.now())
            & (
                ParameterizedValueWrapper(frappe.session.user).notin(
                    SubQuery(frappe.qb.from_(nsb).select(nsb.user).where(nsb.parent == note.name))
                )
            )
        )
    ).run(as_dict=1)
    frappe.cache.set_value(f"{UNSEEN_NOTES_KEY}{frappe.session.user}", results)
