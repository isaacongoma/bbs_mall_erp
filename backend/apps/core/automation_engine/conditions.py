# Ported from frappe/automation_engine/conditions.py (frappe/frappe, MIT), scoped to what this
# port models: the builder's match-field filter tree, and a `doc`/`target`-attribute Python
# expression for the "Advanced Condition" box. The provider-backed "related record"
# (RelatedExists/RelatedCount) condition needs a live relationship graph -- see relationships.py
# for how that's derived here -- and is evaluated the same way as upstream once a source/target
# pair resolves.
from __future__ import annotations

import ast
import operator

CONJUNCTIONS = ("and", "or")
OPERATOR_ALIASES = {"==": "="}

_OP_FUNCS = {
    "=": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
    "like": lambda a, b: str(b or "").strip("%").lower() in str(a or "").lower(),
    "not like": lambda a, b: str(b or "").strip("%").lower() not in str(a or "").lower(),
    "in": lambda a, b: a in (b or []),
    "not in": lambda a, b: a not in (b or []),
    "is": lambda a, b: (a in (None, "")) if b == "not set" else (a not in (None, "")),
}


def evaluate_filter_tree(doc: dict, filters) -> bool:
    """`filters` is the builder's saved list: leaf rows `[field, operator, value]` with
    "and"/"or" strings between them, and a nested list wherever rows were grouped. An empty
    list matches, so a flow with no filters runs."""
    if not filters:
        return True
    if not _has_conjunctions(filters):
        return all(_evaluate_leaf(doc, _normalise_row(row)) for row in filters)
    return _evaluate_sequence(doc, filters)


def _normalise_row(row):
    if isinstance(row, (list, tuple)) and len(row) >= 2 and row[1] in OPERATOR_ALIASES:
        return [row[0], OPERATOR_ALIASES[row[1]], *list(row)[2:]]
    return row


def _has_conjunctions(filters) -> bool:
    return any(isinstance(item, str) and item in CONJUNCTIONS for item in filters)


def _evaluate_sequence(doc, filters) -> bool:
    """`or` binds looser than `and`, so split on `or` and require one group to pass."""
    groups, current = [], []
    for item in filters:
        if isinstance(item, str) and item == "or":
            groups.append(current)
            current = []
        elif isinstance(item, str) and item == "and":
            continue
        else:
            current.append(item)
    groups.append(current)
    return any(all(_evaluate_operand(doc, operand) for operand in group) for group in groups)


def _evaluate_operand(doc, operand) -> bool:
    if isinstance(operand, (list, tuple)) and operand and isinstance(operand[0], (list, tuple)):
        return evaluate_filter_tree(doc, list(operand))
    return evaluate_filter_tree(doc, [operand])


def _evaluate_leaf(doc: dict, row) -> bool:
    if not isinstance(row, (list, tuple)) or len(row) < 3:
        return True
    field, op, value = row[0], row[1], row[2]
    func = _OP_FUNCS.get(op)
    if not func:
        return True
    return bool(func(doc.get(field), value))


# -- Advanced Condition / step_condition: `doc.field` / `target.field` expressions ------------

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


class UnsafeConditionError(Exception):
    pass


def _eval_node(node, scope: dict):
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, scope)
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in ("True", "False", "None"):
            return {"True": True, "False": False, "None": None}[node.id]
        return scope.get(node.id)
    if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
        record = scope.get(node.value.id)
        return record.get(node.attr) if isinstance(record, dict) else None
    if isinstance(node, ast.BoolOp) and type(node.op) in _ALLOWED_BOOLOPS:
        return _ALLOWED_BOOLOPS[type(node.op)](_eval_node(v, scope) for v in node.values)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARY:
        return _ALLOWED_UNARY[type(node.op)](_eval_node(node.operand, scope))
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        return _ALLOWED_BINOPS[type(node.op)](_eval_node(node.left, scope), _eval_node(node.right, scope))
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, scope)
        for op, comparator in zip(node.ops, node.comparators):
            if type(op) not in _ALLOWED_COMPARE:
                raise UnsafeConditionError(f"Operator not allowed: {op}")
            right = _eval_node(comparator, scope)
            if not _ALLOWED_COMPARE[type(op)](left, right):
                return False
            left = right
        return True
    if isinstance(node, (ast.List, ast.Tuple)):
        return [_eval_node(e, scope) for e in node.elts]
    if isinstance(node, ast.Set):
        return {_eval_node(e, scope) for e in node.elts}
    raise UnsafeConditionError(f"Expression not allowed: {ast.dump(node)}")


def safe_eval(expr: str, scope: dict) -> bool:
    """AST-restricted evaluator for `doc.field` / `target.field` boolean expressions. `scope`
    maps names (`doc`, `target`, `context`, ...) to plain dicts of that record's fields."""
    if not expr or not expr.strip():
        return True
    try:
        tree = ast.parse(expr, mode="eval")
        return bool(_eval_node(tree, scope))
    except UnsafeConditionError:
        raise
    except Exception:
        return False


def condition_fieldnames(condition: str) -> set[str] | None:
    """Fieldnames a condition reads off `doc`, or None when it isn't a flat set of `doc.<x>`
    reads (unparseable, or reaches through anything else) -- None means "load the real doc"."""
    try:
        tree = ast.parse(condition or "", mode="eval")
    except (SyntaxError, ValueError):
        return None
    names = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Attribute):
            continue
        if not isinstance(node.value, ast.Name) or node.value.id != "doc":
            return None
        names.add(node.attr)
    return names


# -- related-record condition (RelatedExists / RelatedNotExists / RelatedCount) ----------------

EXISTENCE_OPERATORS = ("RelatedExists", "RelatedNotExists")
RELATED_OPERATORS = (*EXISTENCE_OPERATORS, "RelatedCount")
_COMPARISONS = {
    "=": operator.eq, "!=": operator.ne, ">": operator.gt, ">=": operator.ge, "<": operator.lt, "<=": operator.le,
}


def validate_related_condition(stored, targets: dict):
    from apps.core.automation_engine.relationships import get_relationship_definition

    condition = _parse_related(stored)
    if not condition:
        return
    source = condition["source"]
    if source not in targets:
        raise ValueError(f"Unknown related-condition source alias: {source}")
    if targets[source]:
        get_relationship_definition(targets[source], condition["relationship"])


def evaluate_related_condition(stored, context: dict) -> bool:
    from apps.core.automation_engine.relationships import load_record, query_related

    condition = _parse_related(stored)
    if not condition:
        return True
    reference = context["records"].get(condition["source"])
    if not reference:
        return True
    source = load_record(reference)
    limit = 1 if condition["type"] in EXISTENCE_OPERATORS else None
    count = len(query_related(source, condition["relationship"], condition["filters"], limit))
    return _compare_related(condition, count)


def _parse_related(stored) -> dict | None:
    import json

    if not stored:
        return None
    condition = json.loads(stored) if isinstance(stored, str) else stored
    if not isinstance(condition, dict):
        raise ValueError("Related record condition must be a JSON object")
    operator_name = condition.get("type") or "RelatedExists"
    if operator_name not in RELATED_OPERATORS:
        raise ValueError(f"Unsupported related condition: {operator_name}")
    if not condition.get("relationship"):
        raise ValueError("Related record condition needs a relationship")
    return {
        "type": operator_name,
        "source": condition.get("source") or "trigger",
        "relationship": condition["relationship"],
        "filters": condition.get("filters") or [],
        "comparison": condition.get("comparison") or ">=",
        "value": int(condition.get("value", 1) or 0),
    }


def _compare_related(condition, count) -> bool:
    if condition["type"] == "RelatedExists":
        return count > 0
    if condition["type"] == "RelatedNotExists":
        return count == 0
    func = _COMPARISONS.get(condition["comparison"])
    if not func:
        raise ValueError(f"Unsupported count comparison: {condition['comparison']}")
    return func(count, condition["value"])


def condition_values(condition: str, scope: dict) -> dict:
    """Values of every `doc.x` / `target.x` a condition reads -- used to explain a skipped step."""
    try:
        tree = ast.parse(condition or "", mode="eval")
    except (SyntaxError, ValueError):
        return {}
    values = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Attribute) or not isinstance(node.value, ast.Name):
            continue
        record = scope.get(node.value.id)
        if not isinstance(record, dict):
            continue
        values[f"{node.value.id}.{node.attr}"] = record.get(node.attr)
    return values
