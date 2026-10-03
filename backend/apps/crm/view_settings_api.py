# Ported from crm/fcrm/doctype/crm_view_settings/crm_view_settings.py (frappe/crm, AGPL-3.0)
from __future__ import annotations

import json

from django.core.exceptions import PermissionDenied

from apps.crm.list_defaults import default_list_data
from apps.crm.doctype_registry import get_doctype_model
from apps.crm.query_utils import lookup_order_field


def _sync_default_rows(doctype: str) -> list:
    return default_list_data(doctype)["rows"]


def _sync_default_columns(view: dict) -> list:
    doctype = view.get("dt") or view.get("doctype")
    if view.get("type") == "kanban" and view.get("column_field"):
        from apps.core.meta import get_doctype_meta

        meta = get_doctype_meta(doctype) or {"fields": []}
        field = next((f for f in meta["fields"] if f["fieldname"] == view["column_field"]), None)
        if field and field["fieldtype"] == "Link":
            related = get_doctype_model(field["options"])
            if not related:
                return []
            return [{"name": pk} for pk in related.objects.order_by(lookup_order_field(related)).values_list("pk", flat=True)]
        if field and field["fieldtype"] == "Select":
            return [{"name": o} for o in (field.get("options") or "").split("\n") if o]
        return []
    return default_list_data(doctype)["columns"]


def _remove_duplicates(items: list) -> list:
    return list(dict.fromkeys(items))


def _check_permission(doc, user):
    if user.is_superuser or user.is_staff:
        return
    if doc.public:
        return
    if doc.user_id and doc.user_id == user.pk:
        return
    raise PermissionDenied("Not permitted")


def _get_route_name(doctype: str) -> str:
    name = doctype[4:] if doctype.startswith("CRM ") else doctype
    if not name.endswith("s"):
        name += "s"
    return name


def create(view: dict, user) -> dict:
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    filters = view.get("filters") or {}
    columns = view.get("columns") or []
    rows = view.get("rows") or []
    kanban_columns = view.get("kanban_columns") or []
    kanban_fields = view.get("kanban_fields") or []

    default_rows = _sync_default_rows(view["doctype"])
    rows = _remove_duplicates(rows + default_rows if default_rows else rows)

    if not kanban_columns and view.get("type") == "kanban":
        kanban_columns = _sync_default_columns(view)
    elif not columns:
        columns = _sync_default_columns(view)

    doc = CRMViewSettings(
        name=view["label"], label=view["label"], type=view.get("type", "list"), icon=view.get("icon", ""),
        dt=view["doctype"], user=user, route_name=view.get("route_name") or _get_route_name(view["doctype"]),
        load_default_columns=bool(view.get("load_default_columns")),
        filters=json.dumps(filters), order_by=view.get("order_by", ""), group_by_field=view.get("group_by_field", ""),
        column_field=view.get("column_field", ""), title_field=view.get("title_field", ""),
        kanban_columns=json.dumps(kanban_columns), kanban_fields=json.dumps(kanban_fields),
        columns=json.dumps(columns), rows=json.dumps(rows),
    )
    doc.save()
    return _serialize(doc)


def update(view: dict, user) -> dict:
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    filters = view.get("filters") or {}
    columns = view.get("columns") or []
    rows = view.get("rows") or []
    kanban_columns = view.get("kanban_columns") or []
    kanban_fields = view.get("kanban_fields") or []

    default_rows = _sync_default_rows(view["doctype"])
    rows = _remove_duplicates(rows + default_rows if default_rows else rows)

    doc = CRMViewSettings.objects.get(pk=view["name"])
    _check_permission(doc, user)

    doc.label = view.get("label", doc.label)
    doc.type = view.get("type", "list")
    doc.icon = view.get("icon", "")
    doc.route_name = view.get("route_name") or _get_route_name(view["doctype"])
    doc.load_default_columns = bool(view.get("load_default_columns"))
    doc.filters = json.dumps(filters)
    doc.order_by = view.get("order_by", "")
    doc.group_by_field = view.get("group_by_field", "")
    doc.column_field = view.get("column_field", "")
    doc.title_field = view.get("title_field", "")
    doc.kanban_columns = json.dumps(kanban_columns)
    doc.kanban_fields = json.dumps(kanban_fields)
    doc.columns = json.dumps(columns)
    doc.rows = json.dumps(rows)
    doc.save()
    return _serialize(doc)


def delete(name: str, user):
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    doc = CRMViewSettings.objects.filter(pk=name).first()
    if doc:
        _check_permission(doc, user)
        doc.delete()


def set_public(name: str, value: bool, user):
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    if not (user.is_superuser or user.is_staff):
        raise PermissionDenied("Not permitted")
    doc = CRMViewSettings.objects.get(pk=name)
    if doc.pinned:
        doc.pinned = False
    doc.public = bool(value)
    doc.user = None if value else user
    doc.save()


def pin(name: str, value: bool, user):
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    doc = CRMViewSettings.objects.get(pk=name)
    _check_permission(doc, user)
    doc.pinned = bool(value)
    doc.save()


def create_or_update_standard_view(view: dict, user) -> dict:
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    filters = view.get("filters") or {}
    columns = view.get("columns") or []
    rows = view.get("rows") or []
    kanban_columns = view.get("kanban_columns") or []
    kanban_fields = view.get("kanban_fields") or []
    view["column_field"] = view.get("column_field") or "status"

    default_rows = _sync_default_rows(view["doctype"])
    rows = _remove_duplicates(rows + default_rows if default_rows else rows)

    if not kanban_columns and view.get("type") == "kanban":
        kanban_columns = _sync_default_columns(view)
    elif not columns:
        columns = _sync_default_columns(view)

    doc = CRMViewSettings.objects.filter(
        dt=view["doctype"], type=view.get("type", "list"), is_standard=True, user=user
    ).first()

    if doc:
        doc.label = view.get("label", doc.label)
        doc.type = view.get("type", "list")
        doc.route_name = view.get("route_name") or _get_route_name(view["doctype"])
        doc.load_default_columns = bool(view.get("load_default_columns"))
        doc.filters = json.dumps(filters)
        doc.order_by = view.get("order_by") or "modified desc"
        doc.group_by_field = view.get("group_by_field") or "owner"
        doc.column_field = view["column_field"]
        doc.title_field = view.get("title_field", "")
        doc.kanban_columns = json.dumps(kanban_columns)
        doc.kanban_fields = json.dumps(kanban_fields)
        doc.columns = json.dumps(columns)
        doc.rows = json.dumps(rows)
        doc.is_default = bool(view.get("is_default"))
        doc.save()
    else:
        label = {"group_by": "Group By", "kanban": "Kanban"}.get(view.get("type"), "List")
        doc = CRMViewSettings(
            name=view.get("label") or label, label=view.get("label") or label, type=view.get("type", "list"),
            dt=view["doctype"], user=user, route_name=view.get("route_name") or _get_route_name(view["doctype"]),
            load_default_columns=bool(view.get("load_default_columns")), filters=json.dumps(filters),
            order_by=view.get("order_by") or "modified desc", group_by_field=view.get("group_by_field") or "owner",
            column_field=view["column_field"], title_field=view.get("title_field", ""),
            kanban_columns=json.dumps(kanban_columns), kanban_fields=json.dumps(kanban_fields),
            columns=json.dumps(columns), rows=json.dumps(rows), is_standard=True,
            is_default=bool(view.get("is_default")),
        )
        doc.save()
    return _serialize(doc)


def set_as_default(user, name: str | None = None, type: str | None = None, doctype: str | None = None):
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    if name:
        CRMViewSettings.objects.filter(pk=name).update(is_default=True)
        doctype = doctype or CRMViewSettings.objects.filter(pk=name).values_list("dt", flat=True).first()
    else:
        doc = create_or_update_standard_view({"type": type, "doctype": doctype, "is_default": True}, user)
        name = doc["name"]

    CRMViewSettings.objects.filter(user=user, is_default=True, dt=doctype).exclude(pk=name).update(is_default=False)


def fetch_and_update_kanban_columns(name: str) -> str:
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    doc = CRMViewSettings.objects.get(pk=name)
    if doc.type != "kanban":
        return doc.kanban_columns

    new_columns = _sync_default_columns({"dt": doc.dt, "type": "kanban", "column_field": doc.column_field})
    existing = json.loads(doc.kanban_columns or "[]")
    existing_names = {c.get("name") for c in existing}
    for column in new_columns:
        if column.get("name") not in existing_names:
            existing.append({"name": column.get("name"), "delete": True})

    doc.kanban_columns = json.dumps(existing)
    doc.save()
    return doc.kanban_columns


def _serialize(doc) -> dict:
    return {
        "name": doc.name, "label": doc.label, "type": doc.type, "icon": doc.icon,
        "dt": doc.dt, "user": doc.user_id, "route_name": doc.route_name,
        "load_default_columns": doc.load_default_columns, "filters": doc.filters,
        "order_by": doc.order_by, "group_by_field": doc.group_by_field,
        "column_field": doc.column_field, "title_field": doc.title_field,
        "kanban_columns": doc.kanban_columns, "kanban_fields": doc.kanban_fields,
        "columns": doc.columns, "rows": doc.rows, "is_standard": doc.is_standard,
        "is_default": doc.is_default, "pinned": doc.pinned, "public": doc.public,
    }
