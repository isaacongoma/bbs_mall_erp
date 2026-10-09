from django.utils import timezone

from apps.core.identity import user_email, user_pk
from apps.erpnext.registry import get_model
from apps.frappe.utils import generate_hash

USER_TABLES = ("users", "weighted_users")


def rule_model():
    return get_model("Assignment Rule")


def user_row_model():
    return get_model("Assignment Rule User")


def day_row_model():
    return get_model("Assignment Rule Day")


def active_rules(doctype):
    return list(rule_model().objects.filter(document_type=doctype, disabled=0).order_by("-priority", "-creation"))


def user_rows(rule_name, table_field):
    return user_row_model().objects.filter(parent=rule_name, parentfield=table_field).order_by("idx")


def user_pks(rule_name, table_field="users"):
    pks = [user_pk(row.user) for row in user_rows(rule_name, table_field)]
    return [pk for pk in pks if pk is not None]


def weighted_user_pks(rule_name):
    rows = [(user_pk(row.user), row.weight or 1) for row in user_rows(rule_name, "weighted_users")]
    return [(pk, weight) for pk, weight in rows if pk is not None]


def day_names(rule_name):
    return list(
        day_row_model().objects.filter(parent=rule_name, parentfield="assignment_days").order_by("idx").values_list("day", flat=True)
    )


def last_user_pk(rule):
    return user_pk(rule.last_user)


def set_last_user(rule, user):
    rule_model().objects.filter(pk=rule.pk).update(last_user=user_email(user) or "")


def bump_current_index(rule):
    rule_model().objects.filter(pk=rule.pk).update(current_index=(rule.current_index or 0) + 1)


def _child_defaults(owner):
    now = timezone.now()
    return {"parenttype": "Assignment Rule", "owner": owner, "modified_by": owner, "creation": now, "modified": now}


def replace_users(rule_name, table_field, rows, owner="Administrator"):
    user_rows(rule_name, table_field).delete()
    for index, (user, weight) in enumerate(rows):
        user_row_model().objects.create(
            name=generate_hash(length=10), parent=rule_name, parentfield=table_field, idx=index,
            user=user_email(user), weight=weight, **_child_defaults(owner),
        )


def replace_days(rule_name, days, owner="Administrator"):
    day_row_model().objects.filter(parent=rule_name, parentfield="assignment_days").delete()
    for index, day in enumerate(days):
        day_row_model().objects.create(
            name=generate_hash(length=10), parent=rule_name, parentfield="assignment_days", idx=index,
            day=day, **_child_defaults(owner),
        )


def has_users(rule_name):
    return user_row_model().objects.filter(parent=rule_name).exists()


def duplicate_rule(rule, new_name, owner="Administrator"):
    fields = (
        "document_type", "due_date_based_on", "priority", "disabled", "description", "rule", "assign_condition",
        "unassign_condition", "close_condition", "assign_condition_json", "unassign_condition_json", "field",
    )
    now = timezone.now()
    copy = rule_model().objects.create(
        name=new_name, owner=owner, modified_by=owner, creation=now, modified=now,
        **{field: getattr(rule, field, None) for field in fields},
    )
    for table in USER_TABLES:
        replace_users(new_name, table, [(row.user, row.weight) for row in user_rows(rule.name, table)], owner)
    replace_days(new_name, day_names(rule.name), owner)
    return copy
