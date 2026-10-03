# Translates Frappe-style filters (a dict of {field: value} or {field: [operator, value]})
# into Django Q objects / queryset filters. Frappe's own filter dict/tuple
# convention (used throughout crm/api/doc.py's get_data) has no Django
# equivalent to port from -- this is the necessary bridge.
from django.db.models import Q

_OP_MAP = {
    "=": "exact",
    "!=": "exact",  # negated below
    "like": "icontains",
    "not like": "icontains",  # negated below
    "in": "in",
    "not in": "in",  # negated below
    ">": "gt",
    "<": "lt",
    ">=": "gte",
    "<=": "lte",
}
_NEGATED_OPS = {"!=", "not like", "not in"}


def _strip_wildcards(value):
    if isinstance(value, str):
        return value.strip("%")
    return value


def build_q(filters: dict) -> Q:
    q = Q()
    if not filters:
        return q
    for field, value in filters.items():
        if field.startswith("_"):
            continue  # virtual fields (_assign, _liked_by, ...) filtered separately
        if isinstance(value, (list, tuple)) and len(value) == 2 and isinstance(value[0], str) and value[0].lower() in _OP_MAP:
            op, raw = value
            op = op.lower()
        else:
            op, raw = "=", value

        lookup = _OP_MAP.get(op, "exact")
        raw = _strip_wildcards(raw) if lookup == "icontains" else raw
        condition = Q(**{f"{field}__{lookup}": raw})
        q &= ~condition if op in _NEGATED_OPS else condition
    return q


def lookup_order_field(model) -> str:
    """Best available ordering for a Link-target lookup table (kanban columns,
    default-column sync): the original orders by `modified asc`; our lookup
    models (CRMLeadStatus, CRMDealStatus, ...) don't carry that field, but do
    carry the `position` field their own Meta.ordering already uses -- prefer
    that, since it's what "the natural order for this dropdown" means for a
    status-like table. Falls back to `modified`, then `pk`."""
    field_names = {f.name for f in model._meta.get_fields()}
    if "position" in field_names:
        return "position"
    if "modified" in field_names:
        return "modified"
    return "pk"


def resolve_me(filters: dict, user) -> dict:
    """Replace "@me" / "%@me%" placeholders with the current user's pk."""
    if not filters or not user:
        return filters
    uid = str(user.pk)
    resolved = {}
    for key, value in filters.items():
        if isinstance(value, list):
            resolved[key] = [
                uid if v == "@me" else (v.replace("%@me%", f"%{uid}%") if isinstance(v, str) and "%@me%" in v else v)
                for v in value
            ]
        elif value == "@me":
            resolved[key] = uid
        else:
            resolved[key] = value
    return resolved
