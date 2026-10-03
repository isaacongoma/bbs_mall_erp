# SLA.condition is a user-authored expression like `doc["annual_revenue"] > 100000`
# stored in the database and evaluated against every Lead/Deal, so it can't go
# through Python's eval(). This walks the parsed AST directly and only
# evaluates a safe subset -- attribute/item access on `doc`, comparisons,
# boolean ops, and literals -- refusing everything else (calls, imports,
# attribute access on anything but `doc`, etc).
import ast


class UnsafeConditionError(Exception):
    pass


_ALLOWED_COMPARE = (ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.In, ast.NotIn, ast.Is, ast.IsNot)
_ALLOWED_BOOLOP = (ast.And, ast.Or)


def evaluate_condition(condition: str, doc: dict) -> bool:
    try:
        tree = ast.parse(condition, mode="eval")
    except SyntaxError as exc:
        raise UnsafeConditionError(f"Could not parse condition: {exc}") from exc
    return bool(_eval_node(tree.body, doc))


def _eval_node(node, doc):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.List):
        return [_eval_node(el, doc) for el in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(_eval_node(el, doc) for el in node.elts)
    if isinstance(node, ast.Name):
        if node.id == "doc":
            return doc
        raise UnsafeConditionError(f"Name '{node.id}' is not allowed")
    if isinstance(node, ast.Attribute):
        base = _eval_node(node.value, doc)
        if not isinstance(base, dict):
            raise UnsafeConditionError("Attribute access is only allowed on doc")
        return base.get(node.attr)
    if isinstance(node, ast.Subscript):
        base = _eval_node(node.value, doc)
        key = _eval_node(node.slice, doc)
        if isinstance(base, dict):
            return base.get(key)
        raise UnsafeConditionError("Subscript access is only allowed on doc")
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
        return not _eval_node(node.operand, doc)
    if isinstance(node, ast.BoolOp):
        if not isinstance(node.op, _ALLOWED_BOOLOP):
            raise UnsafeConditionError("Unsupported boolean operator")
        values = [_eval_node(v, doc) for v in node.values]
        return all(values) if isinstance(node.op, ast.And) else any(values)
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, doc)
        result = True
        for op, comparator in zip(node.ops, node.comparators, strict=True):
            if not isinstance(op, _ALLOWED_COMPARE):
                raise UnsafeConditionError("Unsupported comparison operator")
            right = _eval_node(comparator, doc)
            result = result and _apply_compare(op, left, right)
            left = right
        return result
    raise UnsafeConditionError(f"Unsupported expression: {ast.dump(node)}")


def _apply_compare(op, left, right):
    if isinstance(op, ast.Eq):
        return left == right
    if isinstance(op, ast.NotEq):
        return left != right
    if isinstance(op, ast.Lt):
        return left < right
    if isinstance(op, ast.LtE):
        return left <= right
    if isinstance(op, ast.Gt):
        return left > right
    if isinstance(op, ast.GtE):
        return left >= right
    if isinstance(op, ast.In):
        return left in right
    if isinstance(op, ast.NotIn):
        return left not in right
    if isinstance(op, ast.Is):
        return left is right
    if isinstance(op, ast.IsNot):
        return left is not right
    raise UnsafeConditionError("Unsupported comparison operator")
