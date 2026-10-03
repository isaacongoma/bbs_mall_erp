# Ported from crm/api/notifications.py (frappe/crm, AGPL-3.0).
#
# Notification records are only ever READ here -- creation is wired at the
# one trigger point that already existed in this port (doc_api.assign_to_add
# et al., for Assignment-type notifications). Mention notifications
# (crm.api.comment.notify_mentions, parsing @mentions out of comment HTML)
# and WhatsApp/Automation notifications are not wired: no @mention parser or
# WhatsApp/automation-rule engine exists in this port to originate them from.
from __future__ import annotations


def get_notifications(user) -> list[dict]:
    from apps.crm.doctype.notification.notification import CRMNotification

    qs = CRMNotification.objects.filter(to_user=user).select_related("from_user").order_by("-creation")
    result = []
    for n in qs:
        result.append({
            "name": n.pk,
            "creation": n.creation,
            "from_user": {
                "name": n.from_user_id,
                "full_name": n.from_user.full_name if n.from_user_id else "",
            },
            "type": n.type,
            "to_user": n.to_user_id,
            "read": n.read,
            "hash": _get_hash(n),
            "notification_text": n.notification_text,
            "notification_type_doctype": n.notification_type_doctype,
            "notification_type_doc": n.notification_type_doc,
            "reference_doctype": "deal" if n.reference_doctype == "CRM Deal" else "lead",
            "reference_name": n.reference_name,
            "route_name": "Deal" if n.reference_doctype == "CRM Deal" else "Lead",
        })
    return result


def mark_as_read(user, doc: str | None = None) -> None:
    from django.db.models import Q

    from apps.crm.doctype.notification.notification import CRMNotification

    qs = CRMNotification.objects.filter(to_user=user, read=False)
    if doc:
        qs = qs.filter(Q(comment_id=doc) | Q(notification_type_doc=doc))
    qs.update(read=True)


def _get_hash(n) -> str:
    if n.type == "Mention" and n.notification_type_doc:
        return "#" + n.notification_type_doc
    if n.type == "WhatsApp":
        return "#whatsapp"
    if n.type == "Assignment" and n.notification_type_doctype == "CRM Task":
        return "" if "has been removed by" in n.message else "#tasks"
    return ""


def notify_assignment(from_user, to_user_id, doctype: str, name: str, message: str) -> None:
    """Called from doc_api.assign_to_add/assign_to_add_multiple."""
    from apps.crm.doctype.notification.notification import CRMNotification

    if not to_user_id or (from_user and str(to_user_id) == str(from_user.pk)):
        return
    CRMNotification.objects.create(
        from_user=from_user if from_user and getattr(from_user, "is_authenticated", False) else None,
        to_user_id=to_user_id,
        type="Assignment",
        reference_doctype=doctype,
        reference_name=name,
        notification_type_doctype=doctype,
        notification_type_doc=name,
        notification_text=message,
        message=message,
    )
