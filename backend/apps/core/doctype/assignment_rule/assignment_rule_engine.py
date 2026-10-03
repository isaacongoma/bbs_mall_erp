# Ported from frappe/automation/doctype/assignment_rule/assignment_rule.py
# (frappe/frappe, MIT) -- the actual auto-assignment engine: condition
# evaluation, the four assignment strategies, day-of-week gating, and the
# apply()/close/reopen state machine that decides what to do to a document's
# ToDo assignments on every save.
from __future__ import annotations

import ast
import operator

from django.utils import timezone

_ALLOWED_BINOPS = {
    ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
    ast.Div: operator.truediv, ast.Mod: operator.mod,
}
_ALLOWED_BOOLOPS = {ast.And: all, ast.Or: any}
_ALLOWED_COMPARE = {
    ast.Eq: operator.eq, ast.NotEq: operator.ne, ast.Lt: operator.lt, ast.LtE: operator.le,
    ast.Gt: operator.gt, ast.GtE: operator.ge, ast.In: lambda a, b: a in b, ast.NotIn: lambda a, b: a not in b,
    ast.Is: operator.is_, ast.IsNot: operator.is_not,
}
_ALLOWED_UNARY = {ast.Not: operator.not_, ast.USub: operator.neg, ast.UAdd: operator.pos}


class UnsafeExpressionError(Exception):
    pass


def _eval_node(node, doc: dict):
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, doc)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in ("True", "False", "None"):
            return {"True": True, "False": False, "None": None}[node.id]
        return doc.get(node.id)
    if isinstance(node, ast.BoolOp) and type(node.op) in _ALLOWED_BOOLOPS:
        values = [_eval_node(v, doc) for v in node.values]
        return _ALLOWED_BOOLOPS[type(node.op)](values)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARY:
        return _ALLOWED_UNARY[type(node.op)](_eval_node(node.operand, doc))
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        return _ALLOWED_BINOPS[type(node.op)](_eval_node(node.left, doc), _eval_node(node.right, doc))
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, doc)
        for op, comparator in zip(node.ops, node.comparators):
            if type(op) not in _ALLOWED_COMPARE:
                raise UnsafeExpressionError(f"Operator not allowed: {op}")
            right = _eval_node(comparator, doc)
            if not _ALLOWED_COMPARE[type(op)](left, right):
                return False
            left = right
        return True
    if isinstance(node, (ast.List, ast.Tuple)):
        return [_eval_node(e, doc) for e in node.elts]
    if isinstance(node, ast.Set):
        return {_eval_node(e, doc) for e in node.elts}
    raise UnsafeExpressionError(f"Expression not allowed: {ast.dump(node)}")


def safe_eval(expr: str, doc: dict):
    """A restricted-subset expression evaluator standing in for Frappe's
    frappe.safe_eval (AST-restricted eval) -- same intent (let an admin write
    `status == "Open" and source == "Website"` without arbitrary code
    execution), no import/attribute-access/call machinery at all rather than
    Frappe's denylist approach, since assign/unassign/close conditions here
    only ever need boolean comparisons over doc fields."""
    if not expr or not expr.strip():
        return False
    try:
        tree = ast.parse(expr, mode="eval")
        return bool(_eval_node(tree, doc))
    except Exception:
        return False


def get_assignment_days(rule) -> list[str]:
    return [d.day for d in rule.day_rows.all()]


def is_rule_applicable_today(rule) -> bool:
    days = get_assignment_days(rule)
    if not days:
        return True
    today = timezone.localtime().strftime("%A")
    return today in days


def get_user_round_robin(rule) -> str | None:
    users = list(rule.user_rows.filter(table_field="users").order_by("idx").values_list("user_id", flat=True))
    if not users:
        return None
    if not rule.last_user_id or rule.last_user_id == users[-1]:
        return users[0]
    for i, user_id in enumerate(users):
        if rule.last_user_id == user_id and i + 1 < len(users):
            return users[i + 1]
    return users[0]


def get_user_load_balancing(rule) -> str | None:
    from apps.core.doctype.todo.todo import ToDo

    users = list(rule.user_rows.filter(table_field="users").order_by("idx").values_list("user_id", flat=True))
    if not users:
        return None
    counts = [
        (user_id, ToDo.objects.filter(reference_type=rule.document_type, allocated_to_id=user_id, status="Open").count())
        for user_id in users
    ]
    counts.sort(key=lambda c: c[1])
    return counts[0][0]


def get_user_based_on_field(rule, doc: dict) -> str | None:
    from apps.core.models import User

    val = doc.get(rule.field)
    if val and User.objects.filter(pk=val).exists():
        return val
    return None


def get_weighted_user(rule) -> str | None:
    rows = [(r.user_id, r.weight or 1) for r in rule.user_rows.filter(table_field="weighted_users").order_by("idx")]
    if not rows:
        return None
    total_weight = sum(w for _, w in rows)
    if total_weight <= 0:
        return None
    slot = rule.current_index % total_weight
    cumulative = 0
    for user_id, weight in rows:
        cumulative += weight
        if slot < cumulative:
            type(rule).objects.filter(pk=rule.pk).update(current_index=rule.current_index + 1)
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
    from apps.core.doctype.todo.todo import ToDo

    return list(ToDo.objects.filter(reference_type=doctype, reference_name=str(name)).exclude(status="Cancelled")[:5])


def clear_assignments(doctype: str, name: str):
    from apps.core.doctype.todo.todo import ToDo

    ToDo.objects.filter(reference_type=doctype, reference_name=str(name), status="Open").update(status="Cancelled")


def close_assignments(doctype: str, name: str):
    from apps.core.doctype.todo.todo import ToDo

    ToDo.objects.filter(reference_type=doctype, reference_name=str(name), status="Open").update(status="Closed")


def reopen_closed_assignments(doctype: str, name: str) -> bool:
    from apps.core.doctype.todo.todo import ToDo

    qs = ToDo.objects.filter(reference_type=doctype, reference_name=str(name), status="Closed")
    reopened = qs.exists()
    qs.update(status="Open")
    return reopened


def do_assignment(rule, doc: dict) -> bool:
    from apps.core.doctype.todo.todo import ToDo
    from apps.crm.notifications_api import notify_assignment

    clear_assignments(rule.document_type, doc["name"])

    user_id = get_user_for_rule(rule, doc)
    if not user_id:
        return False

    ToDo.objects.create(
        allocated_to_id=user_id, reference_type=rule.document_type, reference_name=str(doc["name"]),
        description=rule.description, status="Open", assignment_rule=rule,
        date=doc.get(rule.due_date_based_on) if rule.due_date_based_on else None,
    )
    notify_assignment(None, user_id, rule.document_type, str(doc["name"]), rule.description)
    type(rule).objects.filter(pk=rule.pk).update(last_user_id=user_id)
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
    from apps.core.doctype.assignment_rule.assignment_rule import AssignmentRule

    rules = list(
        AssignmentRule.objects.filter(document_type=doctype, disabled=False)
        .prefetch_related("user_rows", "day_rows")
        .order_by("-priority")
    )
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
