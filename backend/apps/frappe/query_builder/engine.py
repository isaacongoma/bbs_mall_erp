import re

from pypika import Order
from pypika.functions import Avg, Count, Max, Min, Sum
from pypika.terms import Field, Star, Term

from apps.frappe import exceptions
from apps.frappe.query_builder.builder import Postgres

FIELD_PATTERN = re.compile(
    r"^\s*(?:(?P<func>count|sum|avg|min|max)\s*\(\s*(?P<arg>\*|[\w.`]+)\s*\)|(?P<field>\*|[\w.`]+))"
    r"(?:\s+as\s+(?P<alias>\w+))?\s*$",
    re.IGNORECASE,
)
FUNCTIONS = {"count": Count, "sum": Sum, "avg": Avg, "min": Min, "max": Max}


def _table(doctype):
    return Postgres.DocType(doctype) if isinstance(doctype, str) else doctype


def _field(table, spec):
    match = FIELD_PATTERN.match(spec) if isinstance(spec, str) else None
    if match is None:
        return spec
    alias = match.group("alias")
    if match.group("func"):
        arg = match.group("arg").replace("`", "")
        term = FUNCTIONS[match.group("func").lower()](Star() if arg == "*" else Field(arg, table=table))
    else:
        name = match.group("field").replace("`", "")
        term = Star(table) if name == "*" else Field(name, table=table)
    return term.as_(alias) if alias else term


def _criterion(table, fieldname, operator, value):
    field = fieldname if isinstance(fieldname, Term) else Field(fieldname, table=table)
    operator = str(operator).lower()
    if operator == "=":
        return field.isnull() | (field == "") if value in (None, "") else field == value
    if operator in ("!=", "<>"):
        return field != value
    if operator == "<":
        return field < value
    if operator == ">":
        return field > value
    if operator == "<=":
        return field <= value
    if operator == ">=":
        return field >= value
    if operator == "like":
        return field.ilike(value)
    if operator == "not like":
        return field.not_ilike(value)
    if operator == "in":
        return field.isin(list(value))
    if operator == "not in":
        return field.notin(list(value))
    if operator == "between":
        return field[value[0] : value[1]]
    if operator == "is":
        return field.isnotnull() if str(value).lower() == "set" else field.isnull() | (field == "")
    raise exceptions.DataError(f"Unsupported filter operator: {operator}")


def _apply_filters(query, table, filters):
    if not filters:
        return query
    if isinstance(filters, dict):
        items = []
        for key, value in filters.items():
            if isinstance(value, (list, tuple)) and len(value) == 2 and isinstance(value[0], str):
                items.append((key, value[0], value[1]))
            elif isinstance(value, (list, tuple)):
                items.append((key, "in", value))
            else:
                items.append((key, "=", value))
    else:
        if filters and (isinstance(filters[0], str) or isinstance(filters[0], Term)):
            filters = [filters]
        items = []
        for item in filters:
            if len(item) == 4:
                items.append((item[1], item[2], item[3]))
            elif len(item) == 3:
                items.append(tuple(item))
            else:
                items.append((item[0], "=", item[1]))
    for fieldname, operator, value in items:
        query = query.where(_criterion(table, fieldname, operator, value))
    return query


def get_query(
    table,
    fields=None,
    filters=None,
    order_by=None,
    group_by=None,
    limit=None,
    offset=None,
    distinct=False,
    ignore_permissions=True,
    **kwargs,
):
    table_term = _table(table)
    query = Postgres.from_(table_term)
    if fields is None:
        fields = ["name"]
    if isinstance(fields, str):
        fields = [part.strip() for part in fields.split(",")]
    terms = [_field(table_term, spec) for spec in fields]
    query = query.select(*terms)
    if distinct:
        query = query.distinct()
    query = _apply_filters(query, table_term, filters)
    if group_by:
        for part in group_by.split(",") if isinstance(group_by, str) else group_by:
            query = query.groupby(Field(part.strip().replace("`", ""), table=table_term))
    if order_by:
        for part in order_by.split(",") if isinstance(order_by, str) else order_by:
            bits = part.replace("`", "").split()
            if bits:
                direction = Order.desc if len(bits) > 1 and bits[1].lower() == "desc" else Order.asc
                query = query.orderby(Field(bits[0], table=table_term), order=direction)
    if limit:
        query = query.limit(limit)
    if offset:
        query = query.offset(offset)
    return query
