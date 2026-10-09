import copy
import json
from collections import Counter
from collections.abc import Sequence
from sqlparse import tokens
from frappe import _
from frappe.core.doctype.server_script.server_script_utils import get_server_script_map
from frappe.database.utils import (
    DefaultOrderBy,
    FallBackDateTimeStr,
    NestedSetHierarchy,
    get_doctype_name,
    is_non_text_field,
    is_order_by_in_select,
    unquote_identifier,
)
from frappe.model import OPTIONAL_FIELDS, get_permitted_fields
from frappe.model.meta import get_table_columns
from frappe.model.utils import is_virtual_doctype
from frappe.model.utils.user_settings import get_user_settings, update_user_settings
from frappe.query_builder.utils import Column
from frappe.types import Filters, FilterSignature, FilterTuple
from frappe.utils import (
    cint,
    cstr,
    flt,
    get_filter,
    get_time,
    get_timespan_date_range,
)
import datetime
from functools import cached_property, lru_cache
import sqlparse
from sqlparse.sql import Function, Parenthesis, Statement
import frappe
from frappe.utils.data import convert_type_for_between_filters, sbool
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


def _is_user_model(model):
    return getattr(model._meta, "label", "") == "core.User"


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


def _coerce_date_value(model, fieldname, value):
    from django.db.models import DateField, DateTimeField

    try:
        field = model._meta.get_field(fieldname)
    except Exception:
        return value
    if not isinstance(field, DateField) or isinstance(field, DateTimeField):
        return value

    def plain(item):
        import datetime

        if isinstance(item, datetime.datetime):
            return item.date()
        if isinstance(item, str) and len(item) > 10 and item[4:5] == "-" and item[7:8] == "-":
            return item[:10]
        return item

    if isinstance(value, (list, tuple)):
        return [plain(item) for item in value]
    return plain(value)


def condition_q(model, fieldname, operator, value):
    fieldname = _real_field(model, fieldname)
    _check_field(model, fieldname) if fieldname != "pk" else None
    if hasattr(model, "_meta"):
        try:
            f = model._meta.get_field(fieldname)
            if getattr(f, "is_relation", False) and getattr(f, "related_model", None) and getattr(f.related_model._meta, "model_name", "") == "user":
                if isinstance(value, str) and not value.isdigit():
                    fieldname = f"{fieldname}__email"
        except Exception:
            pass
    value = _coerce_date_value(model, fieldname, value)
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
        fields=[pluck] if pluck else [normalize_field_spec(spec) for spec in (fields if isinstance(fields, (list, tuple)) else [fields] if fields else ["name"])],
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


def _run_query(
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
    model_field_names = _model_fields(model) if hasattr(model, "_meta") else set()
    alias_rename = {}
    for alias, expression, is_aggregate in parsed:
        if is_aggregate:
            ann_key = alias
            if ann_key in model_field_names:
                ann_key = f"__ann__{alias}"
                alias_rename[ann_key] = alias
            annotations[ann_key] = expression
            selected.append(ann_key)
        elif alias == expression:
            plain.append(expression)
            selected.append(alias)
        else:
            ann_key = alias
            if ann_key in model_field_names:
                ann_key = f"__ann__{alias}"
                alias_rename[ann_key] = alias
            annotations[ann_key] = F(expression)
            selected.append(ann_key)

    if group_by:
        group_fields = [_strip(part).strip() for part in group_by.split(",") if part.strip()]
        for group_field in group_fields:
            _check_field(model, group_field)
        qs = qs.values(*group_fields)
        qs = qs.annotate(**{alias: expr for alias, expr in annotations.items()})
        for alias, expression, is_aggregate in parsed:
            if not is_aggregate and alias != expression and alias not in annotations:
                ann_key = alias
                if ann_key in model_field_names:
                    ann_key = f"__ann__{alias}"
                    alias_rename[ann_key] = alias
                qs = qs.annotate(**{ann_key: F(expression)})
        order_names = set(annotations) | set(group_fields)
    elif has_aggregate:
        result = qs.aggregate(**annotations)
        row = _dict({alias_rename.get(alias, alias): result.get(alias) for alias in selected})
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
    if hasattr(model, "_meta"):
        user_fk_cols = {
            f.name for f in model._meta.fields
            if getattr(f, "is_relation", False) and getattr(f, "related_model", None) and getattr(f.related_model._meta, "model_name", "") == "user"
        }
    else:
        user_fk_cols = set()

    if pluck:
        results = list(qs.values_list(value_fields[0], flat=True))
        if user_fk_cols and value_fields[0] in user_fk_cols and results:
            from apps.core.models import User
            all_ids = {v for v in results if isinstance(v, int)}
            if all_ids:
                user_map = dict(User.objects.filter(id__in=all_ids).values_list("id", "email"))
                return [user_map.get(v, v) for v in results]
        return results

    if as_list:
        rows = [list(row) for row in qs.values_list(*value_fields)]
        if user_fk_cols and rows:
            indices = [i for i, f in enumerate(value_fields) if f in user_fk_cols]
            if indices:
                from apps.core.models import User
                all_ids = {r[i] for r in rows for i in indices if isinstance(r[i], int)}
                if all_ids:
                    user_map = dict(User.objects.filter(id__in=all_ids).values_list("id", "email"))
                    for r in rows:
                        for i in indices:
                            r[i] = user_map.get(r[i], r[i])
        return rows

    rows = [_dict(row) for row in qs.values(*value_fields)]
    if user_fk_cols and rows:
        active_cols = [c for c in user_fk_cols if c in rows[0]]
        if active_cols:
            from apps.core.models import User
            all_ids = {r[c] for r in rows for c in active_cols if isinstance(r.get(c), int)}
            if all_ids:
                user_map = dict(User.objects.filter(id__in=all_ids).values_list("id", "email"))
                for r in rows:
                    for c in active_cols:
                        if r.get(c) in user_map:
                            r[c] = user_map[r[c]]
    if alias_rename and rows:
        for r in rows:
            for k, orig in alias_rename.items():
                if k in r:
                    r[orig] = r.pop(k)
    return rows


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


def _plain_value(value):
    import decimal

    return float(value) if isinstance(value, decimal.Decimal) else value


def _plain_rows(rows):
    if not isinstance(rows, list):
        return rows
    converted = []
    for row in rows:
        if isinstance(row, dict):
            for key, value in row.items():
                row[key] = _plain_value(value)
        elif isinstance(row, list):
            row = [_plain_value(value) for value in row]
        else:
            row = _plain_value(row)
        converted.append(row)
    return converted


def run_query(*args, **kwargs):
    return _plain_rows(_run_query(*args, **kwargs))


@lru_cache(maxsize=128)
def _parse_sql(field: str) -> Statement | None:
    """
    Parse a given SQL statement using `sqlparse`.

    Args:
        field (str): The SQL statement string to parse.

    Returns:
        Statement | None: A `sqlparse.sql.Statement` object if parsing succeeds, otherwise `None`.
    """
    if parsed := sqlparse.parse(field):
        return parsed[0]


def cast_name(column: str) -> str:
    """Casts name field to varchar for postgres

    Handles majorly 4 cases:
    1. locate
    2. strpos
    3. ifnull
    4. coalesce

    Uses regex substitution.

    Example:
    input - "ifnull(`tabBlog Post`.`name`, '')=''"
    output - "ifnull(cast(`tabBlog Post`.`name` as varchar), '')=''" """
    if frappe.db.db_type != "postgres":
        return column

    kwargs = {"string": column}
    if "cast(" not in column.lower() and "::" not in column:
        if LOCATE_PATTERN.search(**kwargs):
            return LOCATE_CAST_PATTERN.sub(r"locate(\1, cast(\2 as varchar))", **kwargs)

        elif match := FUNC_IFNULL_PATTERN.search(**kwargs):
            func = match.groups()[0]
            return re.sub(rf"{func}\(\s*([`\"]?name[`\"]?)\s*,", rf"{func}(cast(\1 as varchar),", **kwargs)

        return CAST_VARCHAR_PATTERN.sub(r"cast(\1 as varchar)", **kwargs)

    return column


def get_order_by(doctype, meta):
    order_by = ""

    sort_field = sort_order = None
    if meta.sort_field and "," in meta.sort_field:
        order_by = ", ".join(
            f"{f_split[0].strip()} {f_split[1].strip()}"
            for f in meta.sort_field.split(",")
            if (f_split := f.split(maxsplit=2))
        )

    else:
        sort_field = meta.sort_field or "creation"
        sort_order = (meta.sort_field and meta.sort_order) or "desc"
        order_by = f"{sort_field} {sort_order}"

    return order_by


def has_any_user_permission_for_doctype(doctype, user, applicable_for):
    user_permissions = frappe.permissions.get_user_permissions(user=user)
    doctype_user_permissions = user_permissions.get(doctype, [])

    for permission in doctype_user_permissions:
        if not permission.applicable_for or permission.applicable_for == applicable_for:
            return True

    return False


def get_between_date_filter(value, df=None):
    """Handle datetime filter bounds for between filter values.

    If date is passed but fieldtype is datetime then
            from part is converted to start of day and to part is converted to end of day.
    If any of filter part (to or from) are missing then:
            start or end of current day is assumed as fallback.
    If fieldtypes match with filter values then:
            no change is applied.
    """

    fieldtype = (df and df.fieldtype) or "Datetime"

    from_date = frappe.utils.nowdate()
    to_date = frappe.utils.nowdate()

    if value and isinstance(value, list | tuple):
        if len(value) >= 1:
            from_date = value[0]
        if len(value) >= 2:
            to_date = value[1]

    if fieldtype == "Datetime":
        from_date = convert_type_for_between_filters(from_date, set_time=datetime.time())
        to_date = convert_type_for_between_filters(to_date, set_time=datetime.time(23, 59, 59, 999999))

    if fieldtype == "Datetime":
        cond = f"'{frappe.db.format_datetime(from_date)}' AND '{frappe.db.format_datetime(to_date)}'"
    else:
        cond = f"'{frappe.db.format_date(from_date)}' AND '{frappe.db.format_date(to_date)}'"

    return cond


def get_additional_filter_field(additional_filters_config, f, value):
    additional_filter = additional_filters_config[f.operator.lower()]
    f = frappe._dict(frappe.get_attr(additional_filter["get_field"])())
    if f.query_value:
        for option in f.options:
            option = frappe._dict(option)
            if option.value == value:
                f.value = option.query_value
    return f


def get_date_range(operator: str, value: str):
    timespan_map = {
        "1 week": "week",
        "1 month": "month",
        "3 months": "quarter",
        "6 months": "6 months",
        "1 year": "year",
    }
    period_map = {
        "previous": "last",
        "next": "next",
    }

    if operator != "timespan":
        timespan = f"{period_map[operator]} {timespan_map[value]}"
    else:
        timespan = value

    return get_timespan_date_range(timespan)


def is_plain_field(field: str) -> bool:
    for char in field:
        if char in SPECIAL_FIELD_CHARS:
            return False
    return True


def in_function(substr: str, field: str) -> bool:
    try:
        return substr in field and field.index("(") < field.index(substr) < field.index(")")
    except ValueError:
        return False


def strip_alias(field: str) -> str:
    if " as " in field.lower():
        return field.split(" as ", 1)[0]
    return field


LOCATE_PATTERN = re.compile(r"locate\([^,]+,\s*[`\"]?name[`\"]?\s*\)", flags=re.IGNORECASE)
LOCATE_CAST_PATTERN = re.compile(r"locate\(([^,]+),\s*([`\"]?name[`\"]?)\s*\)", flags=re.IGNORECASE)
FUNC_IFNULL_PATTERN = re.compile(r"(strpos|ifnull|coalesce)\(\s*[`\"]?name[`\"]?\s*,", flags=re.IGNORECASE)
CAST_VARCHAR_PATTERN = re.compile(r"([`\"]?tab[\w`\" -]+\.[`\"]?name[`\"]?)(?!\w)", flags=re.IGNORECASE)
SPECIAL_FIELD_CHARS = frozenset(("(", "`", ".", "'", '"', "*"))


class DatabaseQuery:
    def __init__(self, doctype, user=None):
        self.doctype = doctype
        self.tables = []
        self.link_tables = []
        self.linked_table_aliases = {}
        self.linked_table_counter = Counter()
        self.conditions = []
        self.or_conditions = []
        self.fields = None
        self.join = "left join"
        self.order_by = None
        self.group_by = None
        self.with_childnames = False
        self.user = user or frappe.session.user
        self.ignore_ifnull = False
        self.flags = frappe._dict()
        self.reference_doctype = None
        self.permission_map = {}
        self.shared = []
        self._fetch_shared_documents = False
        self._metas = {}

    @cached_property
    def doctype_meta(self):
        return self.get_meta(self.doctype)

    def get_meta(self, doctype: str):
        if doctype not in self._metas:
            self._metas[doctype] = frappe.get_meta(doctype)
        return self._metas[doctype]

    @property
    def query_tables(self):
        return self.tables + [d.table_alias for d in self.link_tables]

    def execute(
        self,
        fields=None,
        filters: FilterSignature | str | None = None,
        or_filters: FilterSignature | None = None,
        docstatus=None,
        group_by=None,
        order_by=DefaultOrderBy,
        limit_start=False,
        limit_page_length=None,
        as_list=False,
        with_childnames=False,
        debug=False,
        ignore_permissions=False,
        user=None,
        with_comment_count=False,
        join="left join",
        distinct=False,
        start=None,
        page_length=None,
        limit=None,
        ignore_ifnull=False,
        save_user_settings=False,
        save_user_settings_fields=False,
        update=None,
        user_settings=None,
        reference_doctype=None,
        run=True,
        strict=True,
        pluck=None,
        ignore_ddl=False,
        *,
        parent_doctype=None,
    ) -> list:
        self.user = user or frappe.session.user

        if not ignore_permissions:
            self.check_read_permission(self.doctype, parent_doctype=parent_doctype)

        if isinstance(fields, dict) or (fields and isinstance(fields, list) and isinstance(fields[0], list)):
            filters, fields = fields, filters

        elif fields and isinstance(filters, list) and len(filters) > 1 and isinstance(filters[0], str):
            filters, fields = fields, filters

        if fields:
            self.fields = fields
        else:
            self.fields = [f"`tab{self.doctype}`.`{pluck or 'name'}`"]

        if start:
            limit_start = start
        if page_length:
            limit_page_length = page_length
        if limit:
            limit_page_length = limit
        if as_list and not isinstance(self.fields, (Sequence | str)) and len(self.fields) > 1:
            frappe.throw(_("Fields must be a list or tuple when as_list is enabled"))

        self.filters: Filters
        self.or_filters: Filters
        for k, _filters in {
            "filters": filters or Filters(),
            "or_filters": or_filters or Filters(),
        }.items():
            if isinstance(_filters, str):
                _filters = json.loads(_filters)
            if not isinstance(_filters, Filters):
                _filters = Filters(_filters, doctype=self.doctype)
            setattr(self, k, _filters)

        self.docstatus = docstatus or []
        self.group_by = group_by
        self.order_by = order_by
        self.limit_start = cint(limit_start)
        self.limit_page_length = cint(limit_page_length) if limit_page_length else None
        self.with_childnames = with_childnames
        self.debug = debug
        self.join = join
        self.distinct = distinct
        self.as_list = as_list
        self.ignore_ifnull = ignore_ifnull
        self.flags.ignore_permissions = ignore_permissions
        self.update = update
        self.user_settings_fields = copy.deepcopy(self.fields)
        self.run = run
        self.strict = strict
        self.ignore_ddl = ignore_ddl
        self.parent_doctype = parent_doctype

        self.reference_doctype = reference_doctype or self.doctype

        if user_settings:
            self.user_settings = json.loads(user_settings)

        if is_virtual_doctype(self.doctype):
            from frappe.model.base_document import get_controller

            controller = get_controller(self.doctype)
            if not hasattr(controller, "get_list"):
                return []

            self.parse_args()
            kwargs = {
                "as_list": as_list,
                "with_comment_count": with_comment_count,
                "save_user_settings": save_user_settings,
                "save_user_settings_fields": save_user_settings_fields,
                "pluck": pluck,
                "parent_doctype": parent_doctype,
            } | self.__dict__
            return frappe.call(controller.get_list, args=kwargs, **kwargs)

        self.with_comment_count = sbool(with_comment_count) and not as_list and bool(self.doctype)
        self.columns = self.get_table_columns()

        if not self.columns:
            return []

        result = self.build_and_run()

        if self.with_comment_count:
            self.add_comment_count(result)

        if save_user_settings:
            self.save_user_settings_fields = save_user_settings_fields
            self.update_user_settings()

        if pluck:
            return [d[pluck] for d in result]

        if self.doctype and result and not self.flags.ignore_permissions:
            result = self.mask_fields(result)

        return result

    def mask_fields(self, result):
        """Mask fields in the result based on the doctype's masked fields"""
        from frappe.model.utils.mask import mask_dict_results, mask_list_results

        masked_fields = self.get_masked_fields()

        if not masked_fields:
            return result

        if self.as_list:
            field_index_map = {}
            for idx, field in enumerate(self.fields):
                if " as " in field.lower():
                    alias = re.split(r"\s+as\s+", field, flags=re.IGNORECASE)[1].strip(" '`")
                    field_index_map[alias] = idx
                else:
                    col = field.split(".")[-1].strip("`")
                    field_index_map[col] = idx

            return mask_list_results(result, masked_fields, field_index_map)
        else:
            return mask_dict_results(result, masked_fields)

    def get_masked_fields(self):
        """Get masked fields for the doctype"""

        meta = self.get_meta(self.doctype)

        return meta.get_masked_fields(parenttype=self.parent_doctype) + self.get_masked_joined_fields()

    def get_masked_joined_fields(self):
        """Get masked fields of the doctypes joined in through dot notation (`items.rate`)."""
        from frappe.database.query import CORE_DOCTYPES
        from frappe.desk.reportview import extract_fieldnames
        from frappe.model.utils.mask import as_aliased_field

        masked_fields = []
        lookups = {}

        for field in self.fields or []:
            columns = extract_fieldnames(field)
            if not columns or "." not in columns[0]:
                continue

            table, fieldname = columns[0].split(".", 1)
            doctype = self.linked_table_aliases.get(table, table).replace("`", "").removeprefix("tab")

            if doctype == self.doctype or doctype in CORE_DOCTYPES:
                continue

            if doctype not in lookups:
                meta = self.get_meta(doctype)
                parenttype = self.doctype if meta.istable else None
                lookups[doctype] = {df.fieldname: df for df in meta.get_masked_fields(parenttype=parenttype)}

            if df := lookups[doctype].get(fieldname):
                alias = field.split(" as ")[1].strip(" '`") if " as " in field.lower() else None
                masked_fields.append(as_aliased_field(df, alias))

        return masked_fields

    def build_and_run(self):
        args = self.prepare_args()
        args.limit = self.add_limit()

        if not args.fields:
            return []

        if args.conditions:
            args.conditions = "where " + args.conditions

        if self.distinct:
            args.fields = "distinct " + args.fields
            if frappe.db.db_type == "postgres" and not self._can_apply_distinct_order_by(args.order_by):
                args.order_by = ""

        if frappe.db.db_type == "postgres" and args.order_by and args.group_by:
            args = self.prepare_select_args(args)

        query = """select {fields}
from {tables}
{conditions}
{group_by}
{order_by}
{limit}""".format(**args)

        return frappe.db.sql(
            query,
            as_dict=not self.as_list,
            debug=self.debug,
            update=self.update,
            ignore_ddl=self.ignore_ddl,
            run=self.run,
        )

    def prepare_args(self):
        self.parse_args()
        self.sanitize_fields()
        self.extract_tables()
        self.set_optional_columns()
        self.build_conditions()
        self.apply_fieldlevel_read_permissions()
        if self.with_comment_count and not self.group_by and "_comments" in self.columns:
            self.fields.append(f"`tab{self.doctype}`.`_comments`")

        args = frappe._dict()

        if self.with_childnames:
            for t in self.tables:
                if t != f"`tab{self.doctype}`":
                    self.fields.append(f"{t}.name as `{t[4:-1]}:name`")

        assert self.tables, "extract_tables must have populated at least the primary table"
        args.tables = self.tables[0]

        for child in self.tables[1:]:
            args.tables += f" {self.join} {child} on ({self._child_join_condition(child)})"

        for link in self.link_tables:
            link_name = cast_name(f"{link.table_alias}.`name`")
            args.tables += f" {self.join} {link.table_name} {link.table_alias} on ({link_name} = {self.tables[0]}.`{link.fieldname}`)"

        if self.grouped_or_conditions:
            self.conditions.append(f"({' or '.join(self.grouped_or_conditions)})")

        args.conditions = " and ".join(self.conditions)

        if self.or_conditions:
            args.conditions += (" or " if args.conditions else "") + " or ".join(self.or_conditions)

        self.set_field_tables()
        self.cast_name_fields()

        fields = []

        for field in self.fields:
            if field is None:
                fields.append("NULL")
                continue

            stripped_field = field.strip().lower()

            if (
                stripped_field[0] in {"`", "*", '"', "'"}
                or "(" in stripped_field
                or "distinct" in stripped_field
            ):
                fields.append(field)
            elif "as" in stripped_field.split(" "):
                col, _, new = field.split()
                fields.append(f"`{col}` as {new}")
            else:
                fields.append(f"`{field}`")

        args.fields = ", ".join(fields)

        self.set_order_by(args)

        self.validate_order_by_and_group_by(args.order_by)
        args.order_by = (args.order_by and (" order by " + args.order_by)) or ""

        self.validate_order_by_and_group_by(self.group_by)
        args.group_by = (self.group_by and (" group by " + self._group_by_with_link_table_pks())) or ""

        return args

    def _is_dedup_group_by(self) -> bool:
        if not self.group_by:
            return False
        group_by = self.group_by.replace("`", "").replace('"', "").strip()
        return group_by in (f"tab{self.doctype}.name", "name")

    def _group_by_with_link_table_pks(self) -> str:
        """When a dedup group by survives (e.g. a child table stays joined), the
        selected columns of 1:1 joined link tables are not functionally dependent
        on the parent primary key for postgres; grouping additionally by each link
        table's primary key covers them without changing partitions."""
        if not (self.link_tables and frappe.db.db_type == "postgres" and self._is_dedup_group_by()):
            return self.group_by
        return ", ".join([self.group_by, *(f"{link.table_alias}.`name`" for link in self.link_tables)])

    def prepare_select_args(self, args):
        order_field = ORDER_BY_PATTERN.sub("", args.order_by)

        if order_field not in args.fields:
            order_column = order_field.replace("`", "")
            max_argument = order_field
            if QUALIFIED_COLUMN_PATTERN.fullmatch(order_column):
                table, column = order_column.split(".")
                max_argument = f"`{table}`.`{column}`"
            args.fields += f", MAX({max_argument}) as `{order_column}`"
            args.order_by = args.order_by.replace(order_field, f"`{order_column}`")

        return args

    def _can_apply_distinct_order_by(self, order_by: str) -> bool:
        if not order_by:
            return True

        selected_fields = set()
        has_joins = len(self.tables) > 1 or bool(self.link_tables)
        for field in self.fields:
            if field is None:
                continue
            field, *alias = re.split(r"\s+as\s+", field, maxsplit=1, flags=re.IGNORECASE)
            field = unquote_identifier(field)
            if field == "*" or field.endswith(".*"):
                selected_fields.update(self._get_star_columns(field))
            elif "(" not in field:
                selected_fields.add(field)
                if not alias or not has_joins:
                    selected_fields.add(field.rsplit(".", 1)[-1])
                if "." not in field:
                    selected_fields.add(f"tab{self.doctype}.{field}")
            if alias:
                selected_fields.add(unquote_identifier(alias[0]))

        return is_order_by_in_select(order_by, selected_fields, len(self.fields))

    def _get_star_columns(self, field: str) -> set[str]:
        doctype = self.doctype if field == "*" else get_doctype_name(field[:-2])
        columns = set()
        for column in get_table_columns(doctype):
            columns.add(column)
            columns.add(f"tab{doctype}.{column}")
        return columns

    def parse_args(self):
        """Convert fields and filters from strings to list, dicts."""
        if isinstance(self.fields, str):
            if self.fields == "*":
                self.fields = ["*"]
            else:
                try:
                    self.fields = json.loads(self.fields)
                except ValueError:
                    self.fields = [f.strip() for f in self.fields.split(",")]

        self.fields = [f for f in self.fields if f]

        for field in self.fields:
            if "." in field:
                original_field = field
                alias = None
                if " as " in field:
                    field, alias = field.split(" as ", 1)
                linked_fieldname, fieldname = field.split(".", 1)
                linked_field = self.get_meta(self.doctype).get_field(linked_fieldname)
                if not linked_field:
                    continue
                linked_doctype = linked_field.options
                if linked_field.fieldtype == "Link":
                    linked_table = self.append_link_table(linked_doctype, linked_fieldname)
                    field = f"{linked_table.table_alias}.`{fieldname}`"
                else:
                    field = f"`tab{linked_doctype}`.`{fieldname}`"
                if alias:
                    field = f"{field} as {alias}"
                self.fields[self.fields.index(original_field)] = field

    def sanitize_fields(self):
        """
        regex : ^.*[,();].*
        purpose : The regex will look for malicious patterns like `,`, '(', ')', '@', ;' in each
                        field which may leads to sql injection.
        example :
                field = "`DocType`.`issingle`, version()"
        As field contains `,` and mysql function `version()`, with the help of regex
        the system will filter out this field.
        """
        blacklisted_keywords = ["select", "create", "insert", "delete", "drop", "update", "case", "show"]
        blacklisted_functions = [
            "concat",
            "concat_ws",
            "if",
            "coalesce",
            "connection_id",
            "current_user",
            "database",
            "last_insert_id",
            "session_user",
            "system_user",
            "user",
            "version",
            "global",
            "sleep",
        ]

        def _find_subqueries(parsed: Statement) -> list:
            """
            Recursively find all subqueries in a parsed SQL statement.
            """
            subqueries = []

            for token in parsed.tokens:
                if isinstance(token, Parenthesis):
                    is_subquery = False
                    for sub_token in token.tokens:
                        if sub_token.ttype is tokens.DML:
                            is_subquery = True
                            break
                    if is_subquery:
                        subqueries.append(token)
                    subqueries.extend(_find_subqueries(token))
                elif token.is_group:
                    subqueries.extend(_find_subqueries(token))

            return subqueries

        def _check_sql_token(statement: Statement) -> None:
            """
            Checks the output of `sqlparse.parse()` to detect blocked functions and subqueries.
            """
            if _find_subqueries(statement):
                _raise_exception()

            for token in statement.tokens:
                if isinstance(token, Function):
                    if (name := (token.get_name())) and name.lower() in blacklisted_functions:
                        _raise_exception()

                if token.ttype in tokens.Keyword:
                    if any(re.search(rf"\b{kw}\b", token.value.lower()) for kw in blacklisted_keywords):
                        _raise_exception()

                if token.ttype in tokens.Name and not re.match(r"^`\w.*`$", token.value.strip()):
                    if any(re.search(rf"\b{kw}\b", token.value.lower()) for kw in blacklisted_keywords):
                        _raise_exception()

                if token.is_group:
                    _check_sql_token(token)

        def _raise_exception():
            frappe.throw(_("Use of sub-query or function is restricted"), frappe.DataError)

        def _is_query(field):
            if IS_QUERY_PATTERN.match(field):
                _raise_exception()

            elif IS_QUERY_PREDICATE_PATTERN.match(field):
                _raise_exception()

        for field in self.fields:
            lower_field = field.lower().strip()

            if SUB_QUERY_PATTERN.match(field):
                _check_sql_token(_parse_sql(field))

                if "@" in lower_field:
                    _raise_exception()

            if FIELD_QUOTE_PATTERN.match(field):
                _raise_exception()

            if FIELD_COMMA_PATTERN.match(field):
                _raise_exception()

            _is_query(field)

            if self.strict:
                if STRICT_FIELD_PATTERN.match(field):
                    frappe.throw(_("Illegal SQL Query"))

                if STRICT_UNION_PATTERN.match(lower_field):
                    frappe.throw(_("Illegal SQL Query"))

    def extract_tables(self):
        """extract tables from fields"""
        self.tables = [f"`tab{self.doctype}`"]
        sql_functions = [
            "dayofyear(",
            "extract(",
            "locate(",
            "strpos(",
            "count(",
            "sum(",
            "avg(",
        ]
        if self.fields:
            for field in self.fields:
                if "tab" not in field or "." not in field or any(x for x in sql_functions if x in field):
                    continue

                table_name = field.split(".", 1)[0]

                for linked_table in self.link_tables:
                    if linked_table.table_alias == table_name:
                        table_name = linked_table.table_name
                        break

                if table_name.lower().startswith("group_concat("):
                    table_name = table_name[13:]
                if table_name.lower().startswith("distinct"):
                    table_name = table_name[8:].strip()
                if table_name[0] != "`":
                    table_name = f"`{table_name}`"
                if (
                    table_name not in self.query_tables
                    and table_name not in self.linked_table_aliases.values()
                ):
                    self.append_table(table_name)

    def append_table(self, table_name):
        self.tables.append(table_name)
        doctype = table_name[4:-1]
        self.check_read_permission(doctype)

    def append_link_table(self, doctype, fieldname):
        for linked_table in self.link_tables:
            if linked_table.doctype == doctype and linked_table.fieldname == fieldname:
                return linked_table

        self.check_read_permission(doctype)
        self.linked_table_counter.update((doctype,))
        linked_table = frappe._dict(
            doctype=doctype,
            fieldname=fieldname,
            table_name=f"`tab{doctype}`",
            table_alias=f"`tab{doctype}_{self.linked_table_counter[doctype]}`",
        )
        self.linked_table_aliases[linked_table.table_alias.replace("`", "")] = linked_table.table_name
        self.link_tables.append(linked_table)
        return linked_table

    def check_read_permission(self, doctype: str, parent_doctype: str | None = None):
        if self.flags.ignore_permissions:
            return

        self.join = "left join"

        if doctype not in self.permission_map:
            self._set_permission_map(doctype, parent_doctype)

        return self.permission_map[doctype]

    def _set_permission_map(self, doctype: str, parent_doctype: str | None = None):
        ptype = "select" if frappe.only_has_select_perm(doctype) else "read"
        frappe.has_permission(
            doctype,
            ptype=ptype,
            parent_doctype=parent_doctype or self.doctype,
            throw=True,
            user=self.user,
        )
        self.permission_map[doctype] = ptype

    def set_field_tables(self):
        """If there are more than one table, the fieldname must not be ambiguous.
        If the fieldname is not explicitly mentioned, set the default table"""

        def _in_standard_sql_methods(field):
            methods = ("count(", "avg(", "sum(", "extract(", "dayofyear(")
            return field.lower().startswith(methods)

        if len(self.tables) > 1 or len(self.link_tables) > 0:
            for idx, field in enumerate(self.fields):
                if field is not None and "." not in field and not _in_standard_sql_methods(field):
                    self.fields[idx] = f"{self.tables[0]}.{field}"

    def cast_name_fields(self):
        for i, field in enumerate(self.fields):
            if field is not None:
                self.fields[i] = cast_name(field)

    def get_table_columns(self):
        try:
            return get_table_columns(self.doctype)
        except frappe.db.TableMissingError:
            if self.ignore_ddl:
                return None
            else:
                raise

    def set_optional_columns(self):
        """Removes optional columns like `_user_tags`, `_comments` etc. if not in table"""

        self.fields[:] = [f for f in self.fields if f not in OPTIONAL_FIELDS or f in self.columns]
        self.filters[:] = [
            f for f in self.filters if f.fieldname not in OPTIONAL_FIELDS or f.fieldname in self.columns
        ]

    def build_conditions(self):
        self.conditions = []
        self.grouped_or_conditions = []
        self.build_filter_conditions(self.filters, self.conditions)
        self.build_filter_conditions(self.or_filters, self.grouped_or_conditions)

        if not self.flags.ignore_permissions:
            match_conditions = self.build_match_conditions()
            if match_conditions:
                self.conditions.append(f"({match_conditions})")

    def _child_join_condition(self, child_table: str) -> str:
        parent_name = cast_name(f"`tab{self.doctype}`.name")
        return f"{child_table}.parenttype = {frappe.db.escape(self.doctype)} and {child_table}.parent = {parent_name}"

    def build_filter_conditions(self, filters: Filters, conditions: list, ignore_permissions=None):
        """build conditions from user filters"""
        if ignore_permissions is not None:
            self.flags.ignore_permissions = ignore_permissions

        for f in filters:
            conditions.append(self.prepare_filter_condition(f))

    def remove_field(self, idx: int):
        if self.as_list:
            self.fields[idx] = None
        else:
            self.fields.pop(idx)

    def apply_fieldlevel_read_permissions(self):
        """Apply fieldlevel read permissions to the query

        Note: Does not apply to `frappe.model.core_doctype_list`

        Remove fields that user is not allowed to read. If `fields=["*"]` is passed, only permitted fields will
        be returned.

        Example:
                - User has read permission only on `title` for DocType `Note`
                - Query: fields=["*"]
                - Result: fields=["title", ...] // will also include Frappe's meta field like `name`, `owner`, etc.
        """
        from frappe.desk.reportview import extract_fieldnames

        if self.flags.ignore_permissions:
            return

        permitted_fields = set(
            get_permitted_fields(
                doctype=self.doctype,
                parenttype=self.parent_doctype,
                permission_type=self.permission_map.get(self.doctype),
                ignore_virtual=True,
            )
        )

        permitted_child_table_fields = {}

        fields_to_check = list(enumerate(self.fields))[::-1]

        for i, field in fields_to_check:
            columns = extract_fieldnames(field)
            if not columns:
                continue

            column = columns[0]
            if column == "*" and "*" in field:
                if not in_function("*", field):
                    self.fields[i : i + 1] = permitted_fields
                continue

            if not column or column.isnumeric():
                continue

            if column[0] in {"'", '"'}:
                continue

            doctype = None

            if "." in column:
                table, column = column.split(".", 1)
                doctype = self.linked_table_aliases[table] if table in self.linked_table_aliases else table
                doctype = doctype.replace("`", "").removeprefix("tab")

            if doctype and doctype != self.doctype:
                if wrap_grave_quotes(table) not in self.query_tables:
                    raise frappe.PermissionError(doctype)

                if doctype not in permitted_child_table_fields:
                    permitted_child_table_fields[doctype] = set(
                        get_permitted_fields(
                            doctype=doctype,
                            parenttype=self.doctype,
                            ignore_virtual=True,
                        )
                    )

                if column in permitted_child_table_fields[doctype] or column in OPTIONAL_FIELDS:
                    continue

                self.remove_field(i)
                continue

            if column in OPTIONAL_FIELDS or column in permitted_fields:
                continue

            elif "(" in field:
                if "*" in field:
                    continue
                else:
                    for column in columns:
                        if column not in permitted_fields:
                            self.remove_field(i)
                            break
                    continue
            else:
                self.remove_field(i)

    def prepare_filter_condition(self, ft: FilterTuple) -> str:
        """Return a filter condition in the format:

        ifnull(`tabDocType`.`fieldname`, fallback) operator "value"
        """


        from frappe.boot import get_additional_filters_from_hooks

        additional_filters_config = get_additional_filters_from_hooks()
        f: FilterTuple = get_filter(self.doctype, ft, additional_filters_config)

        tname = "`tab" + f.doctype + "`"
        if tname not in self.tables:
            self.append_table(tname)

        column_name = cast_name(f.fieldname if "ifnull(" in f.fieldname else f"{tname}.`{f.fieldname}`")

        if f.operator.lower() in additional_filters_config:
            f.update(get_additional_filter_field(additional_filters_config, f, f.value))

        meta = self.get_meta(f.doctype)
        df = meta.get("fields", {"fieldname": f.fieldname})
        df = df[0] if df else None
        if (
            frappe.db.db_type == "postgres"
            and f.operator.lower() in ("like", "not like")
            and is_non_text_field(f.doctype, f.fieldname, df)
            and "cast(" not in column_name.lower()
        ):
            column_name = f"cast({column_name} as varchar)"

        if f.fieldname in ("_assign", "_liked_by") and f.operator in ("=", "!="):
            f.operator = "like" if f.operator == "=" else "not like"
            if isinstance(f.value, str) and f.value:
                f.value = f"%{f.value}%"

        can_be_null = f.fieldname not in ("name", "modified", "creation")

        value = None

        if f.operator.lower() in NestedSetHierarchy:
            field = meta.get_field(f.fieldname)
            ref_doctype = field.options if field else f.doctype
            lft, rgt = "", ""
            if f.value:
                lft, rgt = frappe.db.get_value(ref_doctype, f.value, ["lft", "rgt"]) or (0, 0)

            if f.operator.lower() in (
                "descendants of",
                "not descendants of",
                "descendants of (inclusive)",
            ):
                nodes = frappe.get_all(
                    ref_doctype,
                    filters={"lft": [">", lft], "rgt": ["<", rgt]},
                    order_by="lft ASC",
                    pluck="name",
                )
                if f.operator.lower() == "descendants of (inclusive)":
                    nodes += [f.value]
            else:
                nodes = frappe.get_all(
                    ref_doctype,
                    filters={"lft": ["<", lft], "rgt": [">", rgt]},
                    order_by="lft DESC",
                    pluck="name",
                )

            fallback = "''"
            value = [frappe.db.escape((cstr(v)).strip(), percent=False) for v in nodes]
            if len(value):
                value = f"({', '.join(value)})"
            else:
                value = "('')"

            f.operator = (
                "not in" if f.operator.lower() in ("not ancestors of", "not descendants of") else "in"
            )

        if f.operator.lower() in ("in", "not in"):
            can_be_null &= not getattr(df, "not_nullable", False)
            if f.operator.lower() == "in":
                can_be_null &= not f.value or any(v is None or v == "" for v in f.value)

            if isinstance(f.value, (list, tuple)) and len(f.value) == 0:
                if f.operator.lower() == "in":
                    return "1=0"
                else:
                    return "1=1"

            if value is None:
                values = f.value or ""
                if isinstance(values, str):
                    try:
                        parsed = json.loads(values)
                        values = parsed if isinstance(parsed, list) else [parsed]
                    except ValueError:
                        values = values.split(",")

                fallback = "''"
                value = [frappe.db.escape((cstr(v) or "").strip(), percent=False) for v in values]
                if len(value):
                    value = f"({', '.join(value)})"
                else:
                    value = "('')"

        else:
            escape = True

            if df and (
                df.fieldtype in ("Check", "Float", "Int", "Currency", "Percent")
                or getattr(df, "not_nullable", False)
            ):
                can_be_null = False

            if f.operator.lower() in ("previous", "next", "timespan"):
                date_range = get_date_range(f.operator.lower(), f.value)
                f.operator = "between"
                f.value = date_range
                fallback = f"'{FallBackDateTimeStr}'"

            if f.operator.lower() in (">", ">=") and (
                f.fieldname in ("creation", "modified")
                or (df and (df.fieldtype == "Date" or df.fieldtype == "Datetime"))
            ):
                can_be_null = False

            if f.operator in (">", "<", ">=", "<=") and (f.fieldname in ("creation", "modified")):
                value = cstr(f.value)
                can_be_null = False
                fallback = f"'{FallBackDateTimeStr}'"

            elif f.operator.lower() in ("between") and (
                f.fieldname in ("creation", "modified")
                or (df and (df.fieldtype == "Date" or df.fieldtype == "Datetime"))
            ):
                escape = False

                can_be_null = False

                value = get_between_date_filter(f.value, df)
                fallback = f"'{FallBackDateTimeStr}'"

            elif f.operator.lower() == "is":
                fallback = "''"
                if f.value == "set":
                    f.operator = "!="
                    can_be_null = False
                elif f.value == "not set":
                    f.operator = "="
                    can_be_null = not getattr(df, "not_nullable", False)
                f.value = value = ""

            elif df and df.fieldtype == "Date":
                value = frappe.db.format_date(f.value)
                fallback = "'0001-01-01'"

            elif (df and df.fieldtype == "Datetime") or isinstance(f.value, datetime.datetime):
                value = frappe.db.format_datetime(f.value)
                fallback = f"'{FallBackDateTimeStr}'"

            elif df and df.fieldtype == "Time":
                value = get_time(f.value).strftime("%H:%M:%S.%f")
                fallback = "'00:00:00'"

            elif f.operator.lower() in ("like", "not like") or (
                isinstance(f.value, str)
                and (not df or df.fieldtype not in ["Float", "Int", "Currency", "Percent", "Check"])
            ):
                value = "" if f.value is None else f.value
                fallback = "''"

                if f.operator.lower() in ("like", "not like") and isinstance(value, str):
                    value = value.replace("\\", "\\\\").replace("%", "%%")

            elif f.operator == "=" and df and df.fieldtype in ("Link", "Data", "Dynamic Link"):
                value = cstr(f.value)
                fallback = "''"

            elif f.fieldname == "name":
                value = f.value if f.value is not None else ""
                fallback = "''"

            elif (
                df
                and (db_type := cstr(frappe.db.type_map.get(df.fieldtype, " ")[0]))
                and db_type in ("varchar", "text", "longtext", "smalltext", "json")
            ) or f.fieldname in ("owner", "modified_by", "parent", "parentfield", "parenttype"):
                value = cstr(f.value)
                fallback = "''"

            else:
                value = flt(f.value)
                fallback = 0

            if isinstance(f.value, Column):
                can_be_null = False
                quote = '"' if frappe.conf.db_type == "postgres" else "`"
                value = f"{tname}.{quote}{f.value.name}{quote}"

            elif escape and isinstance(value, str):
                value = f"{frappe.db.escape(value, percent=False)}"

        if (
            self.ignore_ifnull
            or not can_be_null
            or (f.value and f.operator.lower() in ("=", "like"))
            or "ifnull(" in column_name.lower()
        ):
            if f.operator.lower() == "like" and frappe.conf.get("db_type") == "postgres":
                f.operator = "ilike"
            condition = f"{column_name} {f.operator} {value}"
        else:
            if fallback == value and f.operator == "=":
                condition = f"( {column_name} is NULL OR {column_name} {f.operator} {value} )"
            elif fallback == value and f.operator == "!=":
                condition = f"{column_name} {f.operator} {value}"
            else:
                condition = f"ifnull({column_name}, {fallback}) {f.operator} {value}"

        return condition

    def build_match_conditions(self, as_condition=True) -> str | list:
        """add match conditions if applicable"""
        self.match_filters = []
        self.match_conditions = []
        only_if_shared = False
        if not self.user:
            self.user = frappe.session.user

        if not self.tables:
            self.extract_tables()

        role_permissions = frappe.permissions.get_role_permissions(self.doctype_meta, user=self.user)
        if (
            not self.doctype_meta.istable
            and not role_permissions.get("select")
            and not role_permissions.get("read")
            and not self.flags.ignore_permissions
            and not has_any_user_permission_for_doctype(self.doctype, self.user, self.reference_doctype)
        ):
            only_if_shared = True
            self.shared = frappe.share.get_shared(self.doctype, self.user)
            if not self.shared:
                frappe.throw(_("No permission to read {0}").format(_(self.doctype)), frappe.PermissionError)
            else:
                self.conditions.append(self.get_share_condition())

        else:
            if requires_owner_constraint(role_permissions):
                self._fetch_shared_documents = True
                self.match_conditions.append(
                    f"`tab{self.doctype}`.`owner` = {frappe.db.escape(self.user, percent=False)}"
                )

            elif role_permissions.get("read") or role_permissions.get("select"):
                user_permissions = frappe.permissions.get_user_permissions(self.user)
                self.add_user_permissions(user_permissions)

            if self._fetch_shared_documents:
                self.shared = frappe.share.get_shared(self.doctype, self.user)

        if as_condition:
            conditions = ""
            if self.match_conditions:
                conditions = "((" + ") or (".join(self.match_conditions) + "))"

            doctype_conditions = self.get_permission_query_conditions()
            if doctype_conditions:
                conditions += (" and " + doctype_conditions) if conditions else doctype_conditions

            if not only_if_shared and self.shared and conditions:
                conditions = f"(({conditions}) or ({self.get_share_condition()}))"

            return conditions

        else:
            return self.match_filters

    def get_share_condition(self):
        return (
            cast_name(f"`tab{self.doctype}`.name")
            + f" in ({', '.join(frappe.db.escape(s, percent=False) for s in self.shared)})"
        )

    def add_user_permissions(self, user_permissions):
        doctype_link_fields = self.doctype_meta.get_link_fields()

        doctype_link_fields.append(
            dict(
                options=self.doctype,
                fieldname="name",
            )
        )

        match_filters = {}
        match_conditions = []
        for df in doctype_link_fields:
            if df.get("ignore_user_permissions"):
                continue

            user_permission_values = user_permissions.get(df.get("options"), {})

            if user_permission_values:
                docs = []
                if frappe.get_system_settings("apply_strict_user_permissions"):
                    condition = ""
                else:
                    empty_value_condition = cast_name(
                        f"ifnull(`tab{self.doctype}`.`{df.get('fieldname')}`, '')=''"
                    )
                    condition = empty_value_condition + " or "

                for permission in user_permission_values:
                    if not permission.get("applicable_for"):
                        docs.append(permission.get("doc"))


                    elif df.get("fieldname") == "name" and self.reference_doctype:
                        if permission.get("applicable_for") == self.reference_doctype:
                            docs.append(permission.get("doc"))

                    elif permission.get("applicable_for") == self.doctype:
                        docs.append(permission.get("doc"))

                if docs:
                    values = ", ".join(frappe.db.escape(doc, percent=False) for doc in docs)
                    condition += cast_name(f"`tab{self.doctype}`.`{df.get('fieldname')}`") + f" in ({values})"
                    match_conditions.append(f"({condition})")
                    match_filters[df.get("options")] = docs

        if match_conditions:
            self._fetch_shared_documents = True
            self.match_conditions.append(" and ".join(match_conditions))

        if match_filters:
            self._fetch_shared_documents = True
            self.match_filters.append(match_filters)

    def get_permission_query_conditions(self) -> str:
        conditions = []
        hooks = frappe.get_hooks("permission_query_conditions", {})
        condition_methods = hooks.get(self.doctype, []) + hooks.get("*", [])
        for method in condition_methods:
            if c := frappe.call(frappe.get_attr(method), self.user, doctype=self.doctype):
                if not isinstance(c, str):
                    c = self._render_permission_criterion(c)
                conditions.append(c)

        active_child_tables = []
        if len(self.tables) > 1:
            main_table_name = f"tab{self.doctype}"
            for table_name in self.tables:
                clean_name = table_name.replace("`", "").replace('"', "")
                if clean_name != main_table_name:
                    active_child_tables.append(clean_name)

        if permission_script_name := get_server_script_map().get("permission_query", {}).get(self.doctype):
            script = frappe.get_doc("Server Script", permission_script_name)
            if condition := script.get_permission_query_conditions(
                self.user, active_child_tables=active_child_tables
            ):
                conditions.append(condition)

        return " and ".join(conditions) if conditions else ""

    def _render_permission_criterion(self, criterion) -> str:
        """Render a pypika permission criterion to a namespaced SQL string.

        The legacy query path concatenates conditions into a single WHERE string, so any
        embedded value must be inlined. We collect values via a parameter wrapper and inline
        them with `frappe.db.escape` (the driver's escaping) rather than pypika's bare
        quote-doubling, which is unsafe on MariaDB where backslash is an escape character.
        """
        from frappe.query_builder.terms import NamedParameterWrapper

        quote_char = "`" if frappe.db.db_type == "mariadb" else '"'
        param_wrapper = NamedParameterWrapper()
        sql = criterion.get_sql(
            with_namespace=True, quote_char=quote_char, param_wrapper=param_wrapper, subquery=True
        )
        for key, value in param_wrapper.get_parameters().items():
            sql = sql.replace(f"%({key})s", frappe.db.escape(value))
        return sql

    def set_order_by(self, args):
        if self.order_by and self.order_by != DefaultOrderBy:
            args.order_by = self.order_by
        else:
            args.order_by = ""

            group_function_without_group_by = (
                len(self.fields) == 1
                and (
                    self.fields[0].lower().startswith("count(")
                    or self.fields[0].lower().startswith("min(")
                    or self.fields[0].lower().startswith("max(")
                    or self.fields[0].lower().startswith("sum(")
                    or self.fields[0].lower().startswith("avg(")
                )
                and not self.group_by
            )

            if not group_function_without_group_by:
                sort_field = sort_order = None
                if self.doctype_meta.sort_field and "," in self.doctype_meta.sort_field:
                    args.order_by = ", ".join(
                        f"`tab{self.doctype}`.`{f_split[0].strip()}` {f_split[1].strip()}"
                        for f in self.doctype_meta.sort_field.split(",")
                        if (f_split := f.split(maxsplit=2))
                    )
                else:
                    sort_field = self.doctype_meta.sort_field or "creation"
                    sort_order = (self.doctype_meta.sort_field and self.doctype_meta.sort_order) or "desc"
                    if self.order_by:
                        args.order_by = (
                            f"`tab{self.doctype}`.`{sort_field or 'creation'}` {sort_order or 'desc'}"
                        )

    def validate_order_by_and_group_by(self, parameters: str):
        """Check order by, group by so that atleast one column is selected and does not have subquery"""
        if not parameters:
            return

        _lower = parameters.lower()

        if ORDER_GROUP_PATTERN.match(_lower):
            frappe.throw(_("Illegal SQL Query"))

        subquery_indicators = {
            r"union",
            r"intersect",
            r"select\b.*\bfrom",
        }

        sanitized = re.sub(r"`tab[^`]*`", " doc ", _lower)

        if any(re.search(r"\b" + pattern + r"\b", sanitized) for pattern in subquery_indicators):
            frappe.throw(_("Cannot use sub-query here."))

        blacklisted_sql_functions = {
            "sleep",
            "benchmark",
            "extractvalue",
            "database",
            "user",
            "current_user",
            "version",
            "substr",
            "substring",
            "updatexml",
            "load_file",
            "session_user",
            "system_user",
        }

        for field in parameters.split(","):
            field = field.strip()
            full_field_name = "." in field and field.startswith("`tab")

            if full_field_name:
                tbl = field.split(".", 1)[0]
                if tbl not in self.tables:
                    if tbl.startswith("`"):
                        tbl = tbl[4:-1]
                    frappe.throw(_("Please select atleast 1 column from {0} to sort/group").format(tbl))

            for func in blacklisted_sql_functions:
                if re.search(r"\b" + re.escape(func) + r"\W*\(", field.lower()):
                    frappe.throw(_("Cannot use {0} in order/group by").format(field))

    def add_limit(self):
        if self.limit_page_length:
            return f"limit {self.limit_page_length} offset {self.limit_start}"
        else:
            return ""

    def add_comment_count(self, result):
        for r in result:
            comments = r.pop("_comments", None)
            if not r.name:
                continue

            r._comment_count = comments.count('"name"') if comments else 0

    def update_user_settings(self):
        if not self.save_user_settings_fields and not getattr(self, "user_settings", None):
            return

        user_settings = json.loads(get_user_settings(self.doctype))

        if hasattr(self, "user_settings"):
            user_settings.update(self.user_settings)

        if self.save_user_settings_fields:
            user_settings["fields"] = self.user_settings_fields

        update_user_settings(self.doctype, user_settings)


ORDER_BY_PATTERN = re.compile(r"\ order\ by\ |\ asc|\ ASC|\ desc|\ DESC", flags=re.IGNORECASE)
QUALIFIED_COLUMN_PATTERN = re.compile(r"tab[\w -]+\.\w+")
SUB_QUERY_PATTERN = re.compile("^.*[,();@].*", flags=re.DOTALL)
IS_QUERY_PATTERN = re.compile(r"^(select|delete|update|drop|create)\s")
IS_QUERY_PREDICATE_PATTERN = re.compile(r"\s*[0-9a-zA-z]*\s*( from | group by | order by | where | join )")
FIELD_QUOTE_PATTERN = re.compile(r"[0-9a-zA-Z]+\s*'")
FIELD_COMMA_PATTERN = re.compile(r"[0-9a-zA-Z_]+\s*,")
STRICT_FIELD_PATTERN = re.compile(r".*/\*.*")
STRICT_UNION_PATTERN = re.compile(r".*\s(union).*\s")
ORDER_GROUP_PATTERN = re.compile(r".*[^a-z0-9-_ ,`'\"\.\(\)].*")
