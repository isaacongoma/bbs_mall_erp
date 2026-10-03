# Ported from crm/api/comment.py's add_comment (frappe/crm, AGPL-3.0).
# Mention-notification side effects (notify_mentions) are not ported -- no
# CRM Notification subsystem exists in this port.
from __future__ import annotations


def add_comment(reference_doctype: str, reference_name: str, content: str, user) -> dict:
    from apps.core.models import Comment

    comment = Comment.objects.create(
        reference_doctype=reference_doctype, reference_name=reference_name, content=content, owner=user,
    )
    return {
        "name": str(comment.pk),
        "content": comment.content,
        "owner": user.pk,
        "creation": comment.creation,
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
    }
