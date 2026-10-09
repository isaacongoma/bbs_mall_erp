# Ported from frappe/automation/doctype/assignment_rule/assignment_rule.py
# (frappe/frappe, MIT) -- the actual auto-assignment engine: condition
# evaluation, the four assignment strategies, day-of-week gating, and the
# apply()/close/reopen state machine that decides what to do to a document's
# ToDo assignments on every save.
from __future__ import annotations

from django.utils import timezone

from apps.core import assignment_rules
from apps.frappe.utils.safe_exec import safe_eval_condition


def safe_eval(expr: str, doc: dict):
    if not expr or not expr.strip():
        return False
    try:
        return bool(safe_eval_condition(expr, dict(doc)))
    except Exception:
        return False


def get_assignment_days(rule) -> list[str]:
    return assignment_rules.day_names(rule.name)


def is_rule_applicable_today(rule) -> bool:
    days = get_assignment_days(rule)
    if not days:
        return True
    today = timezone.localtime().strftime("%A")
    return today in days


def get_user_round_robin(rule) -> str | None:
    users = assignment_rules.user_pks(rule.name, "users")
    if not users:
        return None
    last_user_id = assignment_rules.last_user_pk(rule)
    if not last_user_id or last_user_id == users[-1]:
        return users[0]
    for i, user_id in enumerate(users):
        if last_user_id == user_id and i + 1 < len(users):
            return users[i + 1]
    return users[0]


def get_user_load_balancing(rule) -> str | None:
    from apps.core.assignments import open_assignment_count

    users = assignment_rules.user_pks(rule.name, "users")
    if not users:
        return None
    counts = [(user_id, open_assignment_count(rule.document_type, user_id)) for user_id in users]
    counts.sort(key=lambda c: c[1])
    return counts[0][0]


def get_user_based_on_field(rule, doc: dict) -> str | None:
    from apps.core.models import User

    val = doc.get(rule.field)
    if val and User.objects.filter(pk=val).exists():
        return val
    return None


def get_weighted_user(rule) -> str | None:
    rows = assignment_rules.weighted_user_pks(rule.name)
    if not rows:
        return None
    total_weight = sum(w for _, w in rows)
    if total_weight <= 0:
        return None
    slot = (rule.current_index or 0) % total_weight
    cumulative = 0
    for user_id, weight in rows:
        cumulative += weight
        if slot < cumulative:
            assignment_rules.bump_current_index(rule)
            return user_id
    return None


def get_user_for_rule(rule, doc: dict) -> str | None:
    return {
        "Round Robin": lambda: get_user_round_robin(rule),
        "Load Balancing": lambda: get_user_load_balancing(rule),
        "Based on Field": lambda: get_user_based_on_field(rule, doc),
        "Weighted Distribution": lambda: get_weighted_user(rule),
    }.get(rule.rule, lambda: None)()


def get_open_assignments(doctype: str, name: str):
    from apps.core.assignments import assignments_for

    return assignments_for(doctype, name)


def clear_assignments(doctype: str, name: str):
    from apps.core.assignments import set_assignment_status

    set_assignment_status(doctype, name, "Open", "Cancelled")


def close_assignments(doctype: str, name: str):
    from apps.core.assignments import set_assignment_status

    set_assignment_status(doctype, name, "Open", "Closed")


def reopen_closed_assignments(doctype: str, name: str) -> bool:
    from apps.core.assignments import reopen_closed_assignments as reopen

    return reopen(doctype, name)


def do_assignment(rule, doc: dict) -> bool:
    from apps.core.assignments import create_assignment
    from apps.crm.notifications_api import notify_assignment

    clear_assignments(rule.document_type, doc["name"])

    user_id = get_user_for_rule(rule, doc)
    if not user_id:
        return False

    create_assignment(
        rule.document_type, doc["name"], user_id, description=rule.description, rule=rule,
        date=doc.get(rule.due_date_based_on) if rule.due_date_based_on else None,
    )
    notify_assignment(None, user_id, rule.document_type, str(doc["name"]), rule.description)
    assignment_rules.set_last_user(rule, user_id)
    return True


def doc_to_condition_dict(instance) -> dict:
    """Flattens a model instance into the plain {fieldname: value} shape
    conditions are evaluated against -- Link fields resolve to their raw id
    (matching how a Frappe doc's fields are always plain values, never ORM
    objects), same convention _meta_field_map/get_doctype_meta already use
    elsewhere in this port."""
    out = {}
    for f in instance._meta.fields:
        out[f.name] = getattr(instance, f.attname)
    return out


def apply_assignment_rules(doctype: str, name: str, doc: dict) -> None:
    """Entry point called from CRMLead/CRMDeal.save() -- mirrors apply() in
    the original, which real Frappe wires via hooks.py's doc_events on every
    doctype's validate/on_update instead of a save() override."""
    rules = assignment_rules.active_rules(doctype)
    if not rules:
        return

    doc = dict(doc, name=name)
    assignments = get_open_assignments(doctype, name)

    clear = True
    if assignments:
        clear = False
        for rule in rules:
            if not is_rule_applicable_today(rule):
                continue
            if rule.unassign_condition and safe_eval(rule.unassign_condition, doc):
                clear_assignments(doctype, name)
                clear = True
                break

    new_apply = False
    if clear:
        for rule in rules:
            if not is_rule_applicable_today(rule):
                continue
            if rule.assign_condition and safe_eval(rule.assign_condition, doc):
                new_apply = do_assignment(rule, doc)
                if new_apply:
                    break

    assignments = get_open_assignments(doctype, name)
    if assignments:
        for rule in rules:
            if not is_rule_applicable_today(rule):
                continue
            if new_apply:
                continue
            if rule.close_condition and safe_eval(rule.close_condition, doc):
                close_assignments(doctype, name)
                break
            else:
                if reopen_closed_assignments(doctype, name):
                    break
