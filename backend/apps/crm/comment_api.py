from __future__ import annotations

from django.utils import timezone


def create_comment(reference_doctype: str, reference_name: str, content: str, user):
    from apps.core.identity import user_email
    from apps.erpnext.registry import get_model
    from apps.frappe.utils import generate_hash

    email = user_email(user) or ""
    now = timezone.now()
    return get_model("Comment").objects.create(
        name=generate_hash(length=10),
        comment_type="Comment",
        comment_email=email,
        comment_by=getattr(user, "get_full_name", lambda: email)() or email,
        reference_doctype=reference_doctype,
        reference_name=reference_name,
        content=content,
        owner=email,
        modified_by=email,
        creation=now,
        modified=now,
    )


def add_comment(reference_doctype: str, reference_name: str, content: str, user) -> dict:
    comment = create_comment(reference_doctype, reference_name, content, user)
    return {
        "name": comment.name,
        "content": comment.content,
        "owner": user.pk,
        "creation": comment.creation,
        "reference_doctype": reference_doctype,
        "reference_name": reference_name,
    }
