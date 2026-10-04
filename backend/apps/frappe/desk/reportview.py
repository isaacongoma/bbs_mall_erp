import frappe
from apps.frappe.permissions import get_user_permissions


def build_match_conditions(doctype, user=None, as_condition=True):
    user = user or frappe.session.user
    if user == "Administrator":
        return "" if as_condition else []

    permissions = get_user_permissions(user)
    if not permissions:
        return "" if as_condition else []

    meta = frappe.get_meta(doctype)
    table = f"`tab{doctype}`"
    conditions = []

    def quoted(values):
        return ", ".join(frappe.db.escape(value) if False else "'" + str(value).replace("'", "''") + "'" for value in values)

    if doctype in permissions:
        allowed = [row["doc"] for row in permissions[doctype] if not row.get("applicable_for") or row.get("applicable_for") == doctype]
        if allowed:
            conditions.append(f"{table}.`name` in ({quoted(allowed)})")

    for field in meta.get("fields", []):
        if field.get("fieldtype") != "Link" or field.get("ignore_user_permissions"):
            continue
        options = field.get("options")
        if options in permissions and options != doctype:
            allowed = [
                row["doc"]
                for row in permissions[options]
                if not row.get("applicable_for") or row.get("applicable_for") == doctype
            ]
            if allowed:
                conditions.append(
                    f"({table}.`{field['fieldname']}` in ({quoted(allowed)}) or ifnull({table}.`{field['fieldname']}`, '') = '')"
                )

    if not as_condition:
        return conditions
    return " and ".join(conditions)


def get_form_params():
    """parse GET request parameters."""
    data = frappe._dict(frappe.local.form_dict)
    clean_params(data)
    validate_args(data)
    return data


def validate_args(data):
    parse_json(data)
    setup_group_by(data)

    validate_fields(data)
    if data.filters:
        validate_filters(data, data.filters)
    if data.or_filters:
        validate_filters(data, data.or_filters)

    data.strict = None

    return data


def clean_params(data):
    for param in DISALLOWED_PARAMS:
        if param in data:
            del data[param]


def parse_json(data):
    if (filters := data.get("filters")) and isinstance(filters, str):
        data["filters"] = frappe.parse_json(filters)
    if (applied_filters := data.get("applied_filters")) and isinstance(applied_filters, str):
        data["applied_filters"] = frappe.parse_json(applied_filters)
    if (or_filters := data.get("or_filters")) and isinstance(or_filters, str):
        data["or_filters"] = frappe.parse_json(or_filters)
    if (fields := data.get("fields")) and isinstance(fields, str):
        data["fields"] = ["*"] if fields == "*" else frappe.parse_json(fields)
    if isinstance(data.get("docstatus"), str):
        data["docstatus"] = frappe.parse_json(data["docstatus"])
    if "save_user_settings" not in data:
        data["save_user_settings"] = True
    elif isinstance(data.get("save_user_settings"), str):
        data["save_user_settings"] = frappe.parse_json(data["save_user_settings"])
    if isinstance(data.get("start"), str):
        data["start"] = cint(data.get("start"))
    if isinstance(data.get("page_length"), str):
        data["page_length"] = cint(data.get("page_length"))


def get_filters_cond(doctype, filters, conditions, ignore_permissions=None, with_match_conditions=False):
    filters = frappe.parse_json(filters)

    if filters:
        flt = filters
        if isinstance(filters, dict):
            filters = filters.items()
            flt = []
            for f in filters:
                if isinstance(f[1], str) and f[1][0] == "!":
                    flt.append([doctype, f[0], "!=", f[1][1:]])
                elif isinstance(f[1], list | tuple) and f[1][0].lower() in (
                    "=",
                    ">",
                    "<",
                    ">=",
                    "<=",
                    "!=",
                    "like",
                    "not like",
                    "in",
                    "not in",
                    "between",
                    "is",
                ):
                    flt.append([doctype, f[0], f[1][0], f[1][1]])
                else:
                    flt.append([doctype, f[0], "=", f[1]])

        from frappe.database.query import Engine

        engine = Engine()
        engine.get_query(doctype, ignore_permissions=ignore_permissions, db_query_compat=True)

        if with_match_conditions:
            if match_cond := engine.build_match_conditions():
                conditions.append(match_cond)

        engine.build_filter_conditions(flt, conditions)

        cond = " and " + " and ".join(conditions) if conditions else ""
    else:
        cond = ""
    return cond
