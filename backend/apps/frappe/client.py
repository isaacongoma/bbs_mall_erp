from typing import Any

import frappe
from frappe import _
from apps.frappe import exceptions
from apps.frappe.model.db_query import run_query
from apps.frappe.runtime import resolve_model


def _safe_filters(filters):
    if isinstance(filters, str):
        try:
            return frappe.parse_json(filters)
        except ValueError:
            return filters
    return filters


def _json_arg(value):
    if isinstance(value, str):
        try:
            return frappe.parse_json(value)
        except ValueError:
            return value
    return value


@frappe.whitelist()
def get_list(
    doctype: str,
    fields: str | list[str | dict[str, Any]] | None = None,
    filters: str | list | dict[str, Any] | None = None,
    group_by: str | list[str] | None = None,
    order_by: str | list[str] | None = None,
    limit_start: int | str | None = None,
    limit_page_length: int | str = 20,
    parent: str | None = None,
    debug: bool | int = False,
    as_dict: bool | int = True,
    or_filters: str | list[list] | dict[str, Any] | None = None,
    expand: str | list[str] | None = None,
):
    fields = _json_arg(fields)
    if isinstance(fields, str):
        fields = [part.strip() for part in fields.split(",") if part.strip()]
    if isinstance(group_by, list):
        group_by = ", ".join(group_by)
    if isinstance(order_by, list):
        order_by = ", ".join(order_by)
    return frappe.get_list(
        doctype,
        fields=fields,
        filters=_safe_filters(filters),
        or_filters=_safe_filters(or_filters),
        group_by=group_by,
        order_by=order_by,
        limit_start=int(limit_start or 0),
        limit_page_length=int(limit_page_length),
        as_list=not frappe.sbool(as_dict),
    )


@frappe.whitelist()
def get_count(
    doctype: str,
    filters: str | list | dict[str, Any] | None = None,
    debug: int | bool = False,
    cache: int | bool = False,
):
    rows = run_query(
        doctype,
        filters=_safe_filters(filters),
        fields=["count(*) as total_count"],
        ignore_permissions=False,
    )
    return rows[0]["total_count"]


@frappe.whitelist()
def get(
    doctype: str,
    name: str | int | None = None,
    filters: str | list | dict[str, Any] | None = None,
    parent: str | None = None,
):
    if name:
        doc = frappe.get_doc(doctype, name)
    elif filters or filters == {}:
        doc = frappe.get_doc(doctype, frappe.parse_json(filters))
    else:
        doc = frappe.get_doc(doctype)

    doc.check_permission()
    doc.apply_fieldlevel_read_permissions()

    return doc.as_dict(no_nulls=True)


@frappe.whitelist()
def get_value(
    doctype: str,
    fieldname: str | list[str] | dict[str, Any],
    filters: str | list | dict[str, Any] | None = None,
    as_dict: int | bool = True,
    debug: int | bool = False,
    parent: str | None = None,
):
    if not frappe.has_permission(doctype, parent_doctype=parent):
        frappe.throw(_("No permission for {0}").format(_(doctype)), exceptions.PermissionError)

    filters = _safe_filters(filters)
    if isinstance(filters, str):
        filters = {"name": filters}

    try:
        fields = frappe.parse_json(fieldname)
    except (TypeError, ValueError):
        fields = [fieldname]
    if isinstance(fields, str):
        fields = [fields]

    if not filters:
        filters = None

    as_dict = frappe.sbool(as_dict)
    value = frappe.get_list(
        doctype,
        filters=filters,
        fields=fields,
        limit_page_length=1,
        as_list=not as_dict,
    )

    if as_dict:
        return value[0] if value else {}

    if not value:
        return

    return value[0] if len(fields) > 1 else value[0][0]


@frappe.whitelist()
def get_single_value(doctype: str, field: str):
    if not frappe.has_permission(doctype):
        frappe.throw(_("No permission for {0}").format(_(doctype)), exceptions.PermissionError)

    return frappe.db.get_single_value(doctype, field)


@frappe.whitelist(methods=["POST", "PUT"])
def set_value(doctype: str, name: str | int, fieldname: str | dict[str, Any], value: Any | None = None):
    values = {}
    if value is None:
        values = fieldname
        if isinstance(fieldname, str):
            try:
                values = frappe.parse_json(fieldname)
            except ValueError:
                values = {fieldname: ""}
    else:
        values = {fieldname: value}

    forbidden = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "parent", "parentfield", "parenttype"}

    editable = {field: val for field, val in values.items() if field not in forbidden}
    if values and not editable:
        frappe.throw(_("Cannot edit standard fields"))

    values = editable

    doc = frappe.get_doc(doctype, name)
    doc.update(values)
    doc.save()

    return doc.as_dict()


def insert_doc(doc):
    if isinstance(doc, dict) and doc.get("parent") and doc.get("parenttype"):
        parent = frappe.get_doc(doc.get("parenttype"), doc.get("parent"))
        parent.append(doc.get("parentfield"), {key: value for key, value in doc.items() if key not in {"parent", "parenttype", "parentfield"}})
        parent.save()
        return parent
    return frappe.get_doc(doc).insert()


@frappe.whitelist(methods=["POST", "PUT"])
def insert(doc: str | dict[str, Any] | None = None):
    doc = frappe.parse_json(doc)

    return insert_doc(doc).as_dict()


@frappe.whitelist(methods=["POST", "PUT"])
def insert_many(docs: str | list[dict[str, Any]] | None = None):
    docs = frappe.parse_json(docs)

    if len(docs) > 200:
        frappe.throw(_("Only 200 inserts allowed in one request"))

    return [insert_doc(doc).name for doc in docs]


@frappe.whitelist(methods=["POST", "PUT"])
def save(doc: str | dict[str, Any]):
    doc = frappe.parse_json(doc)

    doc = frappe.get_doc(doc)
    doc.save()

    return doc.as_dict()


@frappe.whitelist(methods=["POST", "PUT"])
def rename_doc(doctype: str, old_name: str | int, new_name: str | int, merge: bool = False):
    new_name = frappe.rename_doc(doctype, old_name, new_name, merge=merge)
    return new_name


@frappe.whitelist(methods=["POST", "PUT"])
def submit(doc: str | dict[str, Any]):
    doc = frappe.parse_json(doc)

    doc = frappe.get_doc(doc)
    doc.submit()

    return doc.as_dict()


@frappe.whitelist(methods=["POST", "PUT"])
def cancel(doctype: str, name: str | int):
    wrapper = frappe.get_doc(doctype, name)
    wrapper.cancel()

    return wrapper.as_dict()


@frappe.whitelist(methods=["DELETE", "POST"])
def delete(doctype: str, name: str | int):
    frappe.delete_doc(doctype, name)


@frappe.whitelist(methods=["POST", "PUT"])
def bulk_update(docs: str | list):
    import traceback

    docs = frappe.parse_json(docs)
    failed_docs = []
    for doc in docs:
        doc.pop("flags", None)
        try:
            existing_doc = frappe.get_doc(doc["doctype"], doc["docname"])
            existing_doc.update(doc)
            existing_doc.save()
        except exceptions.ValidationError:
            failed_docs.append({"doc": doc, "exc": traceback.format_exc()})

    return {"failed_docs": failed_docs}


@frappe.whitelist()
def has_permission(doctype: str, docname: str | int, perm_type: str = "read"):
    return {"has_permission": frappe.has_permission(doctype, perm_type.lower(), docname)}
