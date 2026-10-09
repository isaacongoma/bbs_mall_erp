from apps.frappe import exceptions
from apps.frappe.runtime import _dict
from apps.frappe.utils.data import evaluate_filters

VIRTUAL_DOCTYPES = {"DocField", "DocType", "RQ Job"}

DOCTYPE_COLUMNS = (
    "name",
    "module",
    "issingle",
    "istable",
    "is_submittable",
    "is_tree",
    "custom",
    "autoname",
    "naming_rule",
    "title_field",
    "sort_field",
    "sort_order",
    "track_changes",
    "allow_rename",
    "allow_import",
    "editable_grid",
    "quick_entry",
    "description",
    "nsm_parent_field",
    "is_virtual",
    "document_type",
    "engine",
    "owner",
    "creation",
    "modified",
    "modified_by",
    "docstatus",
    "idx",
)


def docfield_rows():
    from apps.erpnext.registry import _meta_by_doctype, get_meta

    rows = []
    for doctype in _meta_by_doctype():
        for index, field in enumerate(get_meta(doctype).get("fields", []), start=1):
            row = _dict(field)
            row["name"] = f"{doctype}-{field.get('fieldname')}"
            row["parent"] = doctype
            row["parenttype"] = "DocType"
            row["parentfield"] = "fields"
            row["idx"] = index
            row["doctype"] = "DocField"
            rows.append(row)
    return rows


def doctype_rows():
    from apps.erpnext.registry import _meta_by_doctype, get_meta

    rows = []
    for doctype in _meta_by_doctype():
        meta = _dict(get_meta(doctype))
        row = _dict({key: meta.get(key) for key in DOCTYPE_COLUMNS})
        row["name"] = doctype
        row["doctype"] = "DocType"
        rows.append(row)
    return rows


def _normalize_filters(filters):
    if not filters:
        return []
    if isinstance(filters, dict):
        out = []
        for key, value in filters.items():
            if isinstance(value, (list, tuple)) and len(value) == 2 and isinstance(value[0], str):
                out.append([key, value[0], value[1]])
            elif isinstance(value, (list, tuple)):
                out.append([key, "in", list(value)])
            else:
                out.append([key, "=", value])
        return out
    if filters and isinstance(filters[0], str):
        filters = [filters]
    out = []
    for item in filters:
        if len(item) == 4:
            out.append([item[1], item[2], item[3]])
        else:
            out.append(list(item))
    return out


def _matches(row, filters):
    for fieldname, operator, value in filters:
        if not evaluate_filters(row, [[fieldname, operator, value]]):
            return False
    return True


def query_virtual(
    doctype,
    filters=None,
    or_filters=None,
    fields=None,
    order_by=None,
    limit=None,
    limit_start=0,
    pluck=None,
    as_list=False,
    distinct=False,
):
    if doctype == "RQ Job":
        from apps.frappe.utils.background_jobs import job_rows

        rows = job_rows()
    else:
        rows = docfield_rows() if doctype == "DocField" else doctype_rows()
    normalized = _normalize_filters(filters)
    rows = [row for row in rows if _matches(row, normalized)]
    if or_filters:
        alternatives = _normalize_filters(or_filters)
        rows = [row for row in rows if any(_matches(row, [alt]) for alt in alternatives)]

    if order_by:
        for part in reversed([p for p in order_by.split(",") if p.strip()]):
            bits = part.replace("`", "").split()
            key = bits[0]
            rows.sort(
                key=lambda row, key=key: (row.get(key) is None, row.get(key) if row.get(key) is not None else ""),
                reverse=len(bits) > 1 and bits[1].lower() == "desc",
            )

    start = int(limit_start or 0)
    rows = rows[start : start + int(limit)] if limit else rows[start:]

    if pluck:
        fields = [pluck]
    fields = list(fields) if isinstance(fields, (list, tuple)) else ([fields] if fields else ["name"])
    if "*" in fields:
        return rows
    selected = []
    for spec in fields:
        parts = spec.replace("`", "").split(" as ")
        selected.append((parts[0].strip(), (parts[-1] if len(parts) > 1 else parts[0]).strip()))
    for source, alias in selected:
        if "(" in source:
            raise exceptions.DataError(f"Aggregates are not supported on {doctype}")
    out = []
    seen = set()
    for row in rows:
        values = [row.get(source) for source, _ in selected]
        if distinct:
            key = tuple(map(str, values))
            if key in seen:
                continue
            seen.add(key)
        if pluck:
            out.append(values[0])
        elif as_list:
            out.append(values)
        else:
            out.append(_dict({alias: value for (_, alias), value in zip(selected, values)}))
    return out
