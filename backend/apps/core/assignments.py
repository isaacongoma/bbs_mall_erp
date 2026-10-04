from django.utils import timezone

from apps.core.identity import user_email, user_emails_by_pk, user_pk, user_pks_by_email
from apps.erpnext.registry import get_model
from apps.frappe.utils import generate_hash


def todo_model():
    return get_model("ToDo")


def _open(queryset, statuses):
    return queryset.filter(status__in=statuses) if statuses else queryset


def assigned_user_pks(doctype, name, statuses=("Open",), excluding=()):
    queryset = todo_model().objects.filter(reference_type=doctype, reference_name=str(name))
    queryset = _open(queryset, statuses)
    if excluding:
        queryset = queryset.exclude(status__in=excluding)
    emails = list(dict.fromkeys(queryset.values_list("allocated_to", flat=True)))
    mapping = user_pks_by_email(emails)
    return [mapping[email] for email in emails if email in mapping]


def assignees_by_name(doctype, names, statuses=("Open",)):
    rows = _open(
        todo_model().objects.filter(reference_type=doctype, reference_name__in=[str(n) for n in names]), statuses
    ).values_list("reference_name", "allocated_to")
    mapping = user_pks_by_email(email for _, email in rows)
    result = {}
    for name, email in rows:
        if email in mapping:
            result.setdefault(name, []).append(mapping[email])
    return result


def has_open_assignment(doctype, name, user):
    return todo_model().objects.filter(
        reference_type=doctype, reference_name=str(name), allocated_to=user_email(user), status="Open"
    ).exists()


def create_assignment(doctype, name, user, assigned_by=None, description="", rule=None, date=None):
    now = timezone.now()
    by_email = user_email(assigned_by) if assigned_by is not None and getattr(assigned_by, "is_authenticated", True) else None
    return todo_model().objects.create(
        name=generate_hash(length=10),
        status="Open",
        priority="Medium",
        reference_type=doctype,
        reference_name=str(name),
        allocated_to=user_email(user),
        assigned_by=by_email or "",
        assignment_rule=getattr(rule, "pk", rule) or "",
        description=description or "",
        date=date,
        owner=by_email or "Administrator",
        modified_by=by_email or "Administrator",
        creation=now,
        modified=now,
    )


def set_assignment_status(doctype, name, from_status, to_status, users=None):
    queryset = todo_model().objects.filter(reference_type=doctype, reference_name=str(name), status=from_status)
    if users is not None:
        queryset = queryset.filter(allocated_to__in=[user_email(user) for user in users])
    return queryset.update(status=to_status, modified=timezone.now())


def set_assignment_status_many(doctype, names, from_status, to_status):
    return (
        todo_model()
        .objects.filter(reference_type=doctype, reference_name__in=[str(n) for n in names], status=from_status)
        .update(status=to_status, modified=timezone.now())
    )


def open_assignment_count(doctype, user):
    return todo_model().objects.filter(reference_type=doctype, allocated_to=user_email(user), status="Open").count()


def assignments_for(doctype, name, exclude_status="Cancelled", limit=5):
    return list(
        todo_model()
        .objects.filter(reference_type=doctype, reference_name=str(name))
        .exclude(status=exclude_status)[:limit]
    )


def reopen_closed_assignments(doctype, name):
    queryset = todo_model().objects.filter(reference_type=doctype, reference_name=str(name), status="Closed")
    reopened = queryset.exists()
    queryset.update(status="Open", modified=timezone.now())
    return reopened
