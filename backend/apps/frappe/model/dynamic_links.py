from __future__ import annotations

import apps.frappe as frappe
from apps.frappe.runtime import resolve_model


def get_dynamic_link_map(for_delete=False):
    if getattr(frappe.local, "dynamic_link_map", None) is None or frappe.in_test:
        dynamic_link_map = {}
        for df in get_dynamic_links():
            try:
                meta = frappe.get_meta(df.parent)
            except frappe.DoesNotExistError:
                continue
            if meta.issingle:
                dynamic_link_map.setdefault(meta.name, []).append(df)
            else:
                try:
                    links = fetch_distinct_link_doctypes(df.parent, df.options)
                except LookupError:
                    continue
                for doctype in links:
                    if not doctype:
                        continue
                    dynamic_link_map.setdefault(doctype, []).append(df)
        frappe.local.dynamic_link_map = dynamic_link_map
    return frappe.local.dynamic_link_map


def get_dynamic_links():
    from apps.erpnext.registry import get_meta, list_doctypes

    rows = []
    for doctype in list_doctypes():
        try:
            meta = get_meta(doctype)
        except KeyError:
            continue
        if meta.get("is_virtual"):
            continue
        for field in meta.get("fields") or []:
            if field.get("fieldtype") != "Dynamic Link" or field.get("is_virtual"):
                continue
            rows.append(
                frappe._dict(
                    parent=doctype,
                    fieldname=field.get("fieldname"),
                    options=field.get("options"),
                    read_only=meta.get("read_only"),
                    in_create=meta.get("in_create"),
                )
            )
    rows.sort(key=lambda df: (df.read_only or 0, df.in_create or 0))
    return rows


def fetch_distinct_link_doctypes(doctype: str, fieldname: str):
    model = resolve_model(doctype)
    return [value for value in model.objects.values_list(fieldname, flat=True).distinct() if value]


def invalidate_distinct_link_doctypes(doctype: str, fieldname: str, linked_doctype: str):
    frappe.local.dynamic_link_map = None
