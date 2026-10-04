import re

from django.db.models import Avg, Count, F, Max, Min, Q, Sum
from django.db.models.functions import Abs

from apps.frappe import exceptions
from apps.frappe.utils.data import get_timespan_date_range

NEGATIVE_OPERATORS = {"!=", "<>", "not like", "not in", "not set", "not descendants of", "not ancestors of"}
COMPARISON_LOOKUPS = {"<": "__lt", ">": "__gt", "<=": "__lte", ">=": "__gte"}
AGGREGATES = {"count": Count, "sum": Sum, "avg": Avg, "min": Min, "max": Max}
FIELD_PATTERN = re.compile(
    r"^\s*(?:(?P<func>count|sum|avg|min|max)\s*\(\s*(?P<arg>\*|distinct\s+[\w.`]+|[\w.`]+)\s*\)|(?P<field>[\w.`]+))"
    r"(?:\s+as\s+(?P<alias>\w+))?\s*$",
    re.IGNORECASE,
)


def _strip(value):
    return value.replace("`", "")


def _doctype_of(model):
    doctype = getattr(model, "doctype", None)
    if doctype:
        return doctype
    table = model._meta.db_table
    return table[3:] if table.startswith("tab") else str(model._meta.verbose_name)


def _model_fields(model):
    return {field.name for field in model._meta.fields}


def _real_field(model, fieldname):
    if fieldname == "name" and "name" not in _model_fields(model):
        return "email" if "email" in _model_fields(model) else "pk"
    return fieldname


def _check_field(model, fieldname):
    if fieldname not in _model_fields(model):
        raise exceptions.DataError(f"Field not permitted in query: {fieldname}")


def _like_q(fieldname, pattern, negate=False):
    pattern = str(pattern)
    if "%" not in pattern and "_" not in pattern:
        q = Q(**{f"{fieldname}__iexact": pattern})
    elif pattern.startswith("%") and pattern.endswith("%") and "%" not in pattern[1:-1] and len(pattern) > 1:
        q = Q(**{f"{fieldname}__icontains": pattern[1:-1]})
    elif pattern.endswith("%") and "%" not in pattern[:-1] and "_" not in pattern:
        q = Q(**{f"{fieldname}__istartswith": pattern[:-1]})
    elif pattern.startswith("%") and "%" not in pattern[1:] and "_" not in pattern:
        q = Q(**{f"{fieldname}__iendswith": pattern[1:]})
    else:
        regex = "".join(".*" if ch == "%" else "." if ch == "_" else re.escape(ch) for ch in pattern)
        q = Q(**{f"{fieldname}__iregex": f"^{regex}$"})
    return ~q if negate else q


def _tree_q(model, fieldname, operator, value):
    if "lft" not in _model_fields(model) or "rgt" not in _model_fields(model):
        raise exceptions.DataError(f"{_doctype_of(model)} is not a tree doctype")
    node = model.objects.filter(pk=value).values("lft", "rgt").first()
    if node is None:
        names = []
    elif "descendants" in operator:
        inclusive = "inclusive" in operator
        lookup = {"lft__gte": node["lft"], "rgt__lte": node["rgt"]} if inclusive else {"lft__gt": node["lft"], "rgt__lt": node["rgt"]}
        names = list(model.objects.filter(**lookup).values_list("name", flat=True))
    else:
        names = list(
            model.objects.filter(lft__lt=node["lft"], rgt__gt=node["rgt"]).values_list("name", flat=True)
        )
    q = Q(**{f"{fieldname}__in": names})
    return ~q if operator.startswith("not ") else q


def condition_q(model, fieldname, operator, value):
    fieldname = _real_field(model, fieldname)
    _check_field(model, fieldname) if fieldname != "pk" else None
    operator = str(operator).strip().lower()
    if operator == "=":
        if value is None or (value == "" and _is_text(model, fieldname)):
            return Q(**{f"{fieldname}__isnull": True}) | Q(**{fieldname: ""}) if _is_text(model, fieldname) else Q(**{f"{fieldname}__isnull": True})
        return Q(**{fieldname: value})
    if operator in ("!=", "<>"):
        if value is None:
            return ~(Q(**{f"{fieldname}__isnull": True}) | Q(**{fieldname: ""})) if _is_text(model, fieldname) else ~Q(**{f"{fieldname}__isnull": True})
        return ~Q(**{fieldname: value}) | Q(**{f"{fieldname}__isnull": True})
    if operator in COMPARISON_LOOKUPS:
        return Q(**{f"{fieldname}{COMPARISON_LOOKUPS[operator]}": value})
    if operator == "like":
        return _like_q(fieldname, value)
    if operator == "not like":
        return _like_q(fieldname, value, negate=True) | Q(**{f"{fieldname}__isnull": True})
    if operator in ("in", "not in"):
        if isinstance(value, str):
            value = [part.strip() for part in value.split(",")]
        q = Q(**{f"{fieldname}__in": list(value or [])})
        return ~q if operator == "not in" else q
    if operator == "between":
        low, high = value
        return Q(**{f"{fieldname}__gte": low, f"{fieldname}__lte": high})
    if operator == "is":
        wants_set = str(value).strip().lower() == "set"
        if _is_text(model, fieldname):
            unset = Q(**{f"{fieldname}__isnull": True}) | Q(**{fieldname: ""})
        else:
            unset = Q(**{f"{fieldname}__isnull": True})
        return ~unset if wants_set else unset
    if operator.endswith("descendants of") or operator.endswith("descendants of (inclusive)") or operator.endswith("ancestors of"):
        return _tree_q(model, fieldname, operator, value)
    raise exceptions.DataError(f"Unsupported filter operator: {operator}")


def _is_text(model, fieldname):
    from django.db.models import CharField, TextField

    return isinstance(model._meta.get_field(fieldname), (CharField, TextField))


def _child_q(doctype, parent_model, child_doctype, fieldname, operator, value):
    from apps.erpnext.registry import get_model

    child_model = get_model(child_doctype)
    child_q = condition_q(child_model, fieldname, operator, value)
    parents = child_model.objects.filter(child_q, parenttype=doctype).values("parent")
    return Q(name__in=parents)


def _normalize(filter_spec, model):
    doctype = _doctype_of(model)
    if isinstance(filter_spec, dict):
        for key, value in filter_spec.items():
            key = _strip(key)
            if isinstance(value, (list, tuple)) and len(value) == 2 and isinstance(value[0], str) and value[0].strip().lower() in KNOWN_OPERATORS:
                yield doctype, key, value[0], value[1]
            elif isinstance(value, (list, tuple)):
                yield doctype, key, "in", list(value)
            else:
                yield doctype, key, "=", value
        return
    if isinstance(filter_spec, (list, tuple)):
        if filter_spec and isinstance(filter_spec[0], str) and not isinstance(filter_spec[0], (list, tuple)):
            filter_spec = [filter_spec]
        for item in filter_spec:
            if isinstance(item, dict):
                yield from _normalize(item, model)
            elif len(item) == 4:
                yield item[0], _strip(item[1]), item[2], item[3]
            elif len(item) == 3:
                yield doctype, _strip(item[0]), item[1], item[2]
            elif len(item) == 2:
                yield doctype, _strip(item[0]), "=", item[1]
            else:
                raise exceptions.DataError(f"Invalid filter: {item!r}")
        return
    if isinstance(filter_spec, str):
        yield doctype, "name", "=", filter_spec
        return
    raise exceptions.DataError(f"Invalid filters: {filter_spec!r}")


KNOWN_OPERATORS = {
    "=", "!=", "<>", "<", ">", "<=", ">=", "like", "not like", "in", "not in", "between", "is",
    "descendants of", "descendants of (inclusive)", "not descendants of", "ancestors of", "not ancestors of",
}


def build_q(model, filters):
    combined = Q()
    for doctype, fieldname, operator, value in _normalize(filters, model):
        if doctype != _doctype_of(model):
            combined &= _child_q(_doctype_of(model), model, doctype, fieldname, operator, value)
        else:
            combined &= condition_q(model, fieldname, operator, value)
    return combined


def apply_filters(qs, filters, or_filters=None):
    model = qs.model
    if filters:
        qs = qs.filter(build_q(model, filters))
    if or_filters:
        combined = Q()
        for doctype, fieldname, operator, value in _normalize(or_filters, model):
            if doctype != _doctype_of(model):
                combined |= _child_q(_doctype_of(model), model, doctype, fieldname, operator, value)
            else:
                combined |= condition_q(model, fieldname, operator, value)
        qs = qs.filter(combined)
    return qs


def normalize_field_spec(spec):
    if isinstance(spec, dict):
        items = {key: value for key, value in spec.items() if key.lower() != "as"}
        function, argument = next(iter(items.items()))
        alias = next((value for key, value in spec.items() if key.lower() == "as"), None)
        text = f"{function.lower()}({argument})"
        return f"{text} as {alias}" if alias else text
    return spec


def parse_field(model, spec):
    spec = normalize_field_spec(spec)
    match = FIELD_PATTERN.match(spec)
    if not match:
        raise exceptions.DataError(f"Invalid field in query: {spec}")
    alias = match.group("alias")
    if match.group("func"):
        function = match.group("func").lower()
        arg = _strip(match.group("arg"))
        distinct = False
        if arg.lower().startswith("distinct"):
            distinct = True
            arg = arg.split(None, 1)[1]
        if arg != "*":
            _check_field(model, arg)
        aggregate = AGGREGATES[function](F(arg) if arg != "*" else "pk", distinct=distinct) if function == "count" else AGGREGATES[function](F(arg))
        return alias or f"{function}({arg})", aggregate, True
    fieldname = _strip(match.group("field"))
    real = _real_field(model, fieldname)
    if real != "pk":
        _check_field(model, real)
    return alias or fieldname, real, False


def apply_order_by(qs, order_by, annotation_names=()):
    if not order_by:
        return qs
    ordering = []
    for part in order_by.split(","):
        bits = _strip(part).split()
        if not bits:
            continue
        name = bits[0]
        if name.startswith("tab") and "." in name:
            name = name.split(".", 1)[1]
        if name not in annotation_names:
            _check_field(qs.model, name)
        descending = len(bits) > 1 and bits[1].lower() == "desc"
        ordering.append(("-" if descending else "") + name)
    return qs.order_by(*ordering) if ordering else qs


def _has_term_filters(filters):
    from pypika.terms import Term

    if isinstance(filters, (list, tuple)):
        if filters and isinstance(filters[0], Term):
            return True
        return any(
            isinstance(item, (list, tuple)) and item and isinstance(item[0], Term) for item in filters
        )
    return False


def run_qb_query(doctype, filters, fields, order_by, limit, limit_start, pluck, as_list, distinct, group_by):
    from apps.frappe.query_builder.engine import get_query
    from apps.frappe.runtime import _dict

    query = get_query(
        doctype,
        fields=[pluck] if pluck else (fields or ["name"]),
        filters=filters,
        order_by=order_by,
        group_by=group_by,
        limit=limit,
        offset=limit_start or None,
        distinct=distinct,
    )
    if pluck:
        return query.run(pluck=True)
    rows = query.run(as_dict=not as_list)
    return rows if as_list else [_dict(row) for row in rows]


CHILD_FIELD_PATTERN = re.compile(r"^`tab(?P<doctype>[^`]+)`\.(?P<field>\w+)$")


def _child_aggregate_plan(fields):
    if not isinstance(fields, (list, tuple)) or not fields:
        return None
    child_doctype = None
    plan = []
    for spec in fields:
        if not isinstance(spec, dict):
            return None
        alias = next((value for key, value in spec.items() if key.lower() == "as"), None)
        items = [(key, value) for key, value in spec.items() if key.lower() != "as"]
        if len(items) != 1:
            return None
        function, argument = items[0]
        inner = None
        if isinstance(argument, (list, tuple)) and len(argument) == 1 and isinstance(argument[0], dict):
            inner, argument = next(iter(argument[0].items()))
        match = CHILD_FIELD_PATTERN.match(str(argument))
        if not match or function.lower() not in AGGREGATES:
            return None
        if child_doctype not in (None, match.group("doctype")):
            return None
        child_doctype = match.group("doctype")
        plan.append((alias or match.group("field"), function.lower(), (inner or "").lower(), match.group("field")))
    return child_doctype, plan


def run_child_aggregate(doctype, model, child_doctype, plan, filters, or_filters, pluck, as_list):
    from apps.erpnext.registry import get_model
    from apps.frappe.runtime import _dict

    child_model = get_model(child_doctype)
    parent_filters = []
    child_filters = []
    for entry_doctype, fieldname, operator, value in _normalize(filters, model):
        if entry_doctype == child_doctype:
            child_filters.append(condition_q(child_model, fieldname, operator, value))
        else:
            parent_filters.append([entry_doctype, fieldname, operator, value])
    parents = apply_filters(model.objects.all(), parent_filters, or_filters).values("name")
    rows = child_model.objects.filter(parenttype=doctype, parent__in=parents)
    for condition in child_filters:
        rows = rows.filter(condition)
    annotations = {}
    for alias, function, inner, fieldname in plan:
        expression = Abs(F(fieldname)) if inner == "abs" else F(fieldname)
        annotations[alias] = AGGREGATES[function](expression)
    result = rows.aggregate(**annotations)
    row = _dict({alias: result.get(alias) for alias, *_ in plan})
    if pluck:
        return [row[pluck]]
    return [list(row.values())] if as_list else [row]


def run_query(
    doctype,
    filters=None,
    or_filters=None,
    fields=None,
    order_by=None,
    group_by=None,
    limit=None,
    limit_start=0,
    pluck=None,
    as_list=False,
    distinct=False,
    ignore_permissions=False,
    user=None,
):
    from apps.frappe.permissions import apply_user_permissions, has_permission, raise_permission_error, resolve_user
    from apps.frappe.runtime import resolve_model, _dict
    from apps.frappe.model.virtual_meta import VIRTUAL_DOCTYPES, query_virtual

    if doctype in VIRTUAL_DOCTYPES:
        return query_virtual(
            doctype,
            filters=filters,
            or_filters=or_filters,
            fields=fields,
            order_by=order_by,
            limit=limit,
            limit_start=limit_start,
            pluck=pluck,
            as_list=as_list,
            distinct=distinct,
        )

    model = resolve_model(doctype)
    if _has_term_filters(filters):
        return run_qb_query(doctype, filters, fields, order_by, limit, limit_start, pluck, as_list, distinct, group_by)
    if not ignore_permissions:
        if not has_permission(doctype, "read", user=user):
            raise_permission_error(doctype, "read")
    child_plan = _child_aggregate_plan(fields)
    if child_plan and not group_by:
        return run_child_aggregate(doctype, model, child_plan[0], child_plan[1], filters, or_filters, pluck, as_list)
    qs = model.objects.all()
    qs = apply_filters(qs, filters, or_filters)
    if not ignore_permissions:
        qs = apply_user_permissions(doctype, qs, user=user)

    if pluck:
        fields = [pluck]
    fields = list(fields) if isinstance(fields, (list, tuple)) else ([fields] if fields else ["name"])
    fields = [normalize_field_spec(spec) for spec in fields]
    if "*" in fields:
        fields = [field for field in fields if field != "*"] + [f.name for f in model._meta.fields]

    parsed = [parse_field(model, spec) for spec in fields]
    has_aggregate = any(is_aggregate for _, _, is_aggregate in parsed)
    plain = []
    annotations = {}
    selected = []
    for alias, expression, is_aggregate in parsed:
        if is_aggregate:
            annotations[alias] = expression
            selected.append(alias)
        elif alias == expression:
            plain.append(expression)
            selected.append(alias)
        else:
            annotations[alias] = F(expression)
            selected.append(alias)

    if group_by:
        group_fields = [_strip(part).strip() for part in group_by.split(",") if part.strip()]
        for group_field in group_fields:
            _check_field(model, group_field)
        qs = qs.values(*group_fields)
        qs = qs.annotate(**{alias: expr for alias, expr in annotations.items()})
        for alias, expression, is_aggregate in parsed:
            if not is_aggregate and alias != expression and alias not in annotations:
                qs = qs.annotate(**{alias: F(expression)})
        order_names = set(annotations) | set(group_fields)
    elif has_aggregate:
        result = qs.aggregate(**annotations)
        row = _dict({alias: result.get(alias) for alias in selected})
        if pluck:
            return [row[pluck]]
        return [list(row.values())] if as_list else [row]
    else:
        order_names = set(annotations)
        if annotations:
            qs = qs.annotate(**annotations)

    if not order_by and "creation" in _model_fields(model):
        order_by = "creation desc"
    if group_by:
        qs = apply_order_by(qs, order_by, order_names) if order_by and _order_ok(order_by, order_names, model) else qs
    else:
        qs = apply_order_by(qs, order_by, order_names)

    if distinct:
        qs = qs.distinct()
    start = int(limit_start or 0)
    if limit:
        qs = qs[start : start + int(limit)]
    elif start:
        qs = qs[start:]

    value_fields = selected
    if pluck:
        return list(qs.values_list(value_fields[0], flat=True))
    if as_list:
        return [list(row) for row in qs.values_list(*value_fields)]
    return [_dict(row) for row in qs.values(*value_fields)]


def _order_ok(order_by, order_names, model):
    names = _model_fields(model) | set(order_names)
    for part in order_by.split(","):
        bits = _strip(part).split()
        if bits and bits[0] not in names:
            return False
    return True


def requires_owner_constraint(role_permissions):
    if not role_permissions.get("has_if_owner_enabled"):
        return

    if_owner_perms = role_permissions.get("if_owner")
    if not if_owner_perms:
        return

    for perm_type in ("select", "read"):
        if role_permissions.get(perm_type) and perm_type not in if_owner_perms:
            return

    return True


def wrap_grave_quotes(table: str) -> str:
    if table[0] != "`":
        table = f"`{table}`"
    return table
