# Ported from crm/api/doc.py (frappe/crm, AGPL-3.0)
from __future__ import annotations

import json

from django.db.models import Count

from apps.core.meta import get_doctype_meta
from apps.crm.doctype_registry import get_doctype_model
from apps.crm.list_defaults import default_kanban_settings, default_list_data
from apps.crm.query_utils import build_q, lookup_order_field, resolve_me

ALLOWED_FILTER_FIELDTYPES = {
    "Check", "Data", "Float", "Int", "Currency", "Link", "Select", "Duration", "Date", "Datetime",
    "Small Text", "Text", "Text Editor",
}


def _meta_field_map(doctype_label: str) -> dict:
    meta = get_doctype_meta(doctype_label) or {"fields": []}
    return {f["fieldname"]: f for f in meta["fields"]}


def sort_options(doctype: str) -> list:
    fields = _meta_field_map(doctype)
    options = [
        {"label": f["label"], "value": name, "fieldname": name}
        for name, f in fields.items()
        if f.get("label")
    ]
    standard = [
        {"label": "Name", "fieldname": "name"}, {"label": "Created On", "fieldname": "creation"},
        {"label": "Last Modified", "fieldname": "modified"}, {"label": "Modified By", "fieldname": "modified_by"},
        {"label": "Owner", "fieldname": "owner"},
    ]
    for s in standard:
        s["value"] = s["fieldname"]
    return options + standard


def get_filterable_fields(doctype: str) -> list:
    model = get_doctype_model(doctype)
    restricted = getattr(model, "get_non_filterable_fields", lambda: [])() if model else []
    fields = _meta_field_map(doctype)

    standard = [
        {"fieldname": "name", "fieldtype": "Link", "label": "Name", "options": doctype},
        {"fieldname": "owner", "fieldtype": "Link", "label": "Created By", "options": "User"},
        {"fieldname": "modified_by", "fieldtype": "Link", "label": "Last Updated By", "options": "User"},
        {"fieldname": "_assign", "fieldtype": "Text", "label": "Assigned To"},
        {"fieldname": "creation", "fieldtype": "Datetime", "label": "Created On"},
        {"fieldname": "modified", "fieldtype": "Datetime", "label": "Last Updated On"},
    ]

    result = []
    for field in standard + list(fields.values()):
        if field["fieldname"] in restricted:
            continue
        if field.get("fieldtype") not in ALLOWED_FILTER_FIELDTYPES:
            continue
        field = {**field, "name": field["fieldname"], "value": field["fieldname"]}
        result.append(field)
    return result


def get_group_by_fields(doctype: str) -> list:
    fields = _meta_field_map(doctype)
    allowed = {"Check", "Data", "Float", "Int", "Currency", "Link", "Select", "Duration", "Date", "Datetime"}
    result = [
        {"label": f["label"], "fieldname": name} for name, f in fields.items()
        if f.get("fieldtype") in allowed and f.get("label")
    ]
    result += [
        {"label": "Name", "fieldname": "name"}, {"label": "Created On", "fieldname": "creation"},
        {"label": "Last Modified", "fieldname": "modified"}, {"label": "Modified By", "fieldname": "modified_by"},
        {"label": "Owner", "fieldname": "owner"}, {"label": "Assigned To", "fieldname": "_assign"},
    ]
    return result


def get_quick_filters(doctype: str) -> list:
    from apps.crm.doctype.global_settings.global_settings import CRMGlobalSettings

    fields_map = _meta_field_map(doctype)
    gs = CRMGlobalSettings.objects.filter(dt=doctype, type="Quick Filters").first()

    if gs:
        stored = json.loads(gs.json or "[]")
        fields = []
        for fieldname in stored:
            if fieldname == "name":
                fields.append({"label": "Name", "fieldname": "name", "fieldtype": "Data"})
            elif fieldname in fields_map:
                fields.append(fields_map[fieldname])
    else:
        fields = [f for f in fields_map.values() if f.get("in_standard_filter")]

    quick_filters = []
    for field in fields:
        options = field.get("options")
        if field.get("fieldtype") == "Select" and options:
            opts = [{"label": o, "value": o} for o in options.split("\n")]
            if not any(not o["value"] for o in opts):
                opts.insert(0, {"label": "", "value": ""})
            options = opts
        quick_filters.append({
            "label": field.get("label"), "fieldname": field.get("fieldname"),
            "fieldtype": field.get("fieldtype"), "options": options,
        })

    if doctype == "CRM Lead":
        quick_filters = [f for f in quick_filters if f.get("fieldname") != "converted"]
    return quick_filters


def update_quick_filters(doctype: str, quick_filters: list, old_filters: list):
    from apps.crm.doctype.global_settings.global_settings import CRMGlobalSettings
    from apps.crm.doctype.quick_filter_override.quick_filter_override import QuickFilterOverride

    new_filters = [f for f in quick_filters if f not in old_filters]
    removed_filters = [f for f in old_filters if f not in quick_filters]

    gs, _created = CRMGlobalSettings.objects.get_or_create(
        dt=doctype, type="Quick Filters", defaults={"json": json.dumps(quick_filters)}
    )
    gs.json = json.dumps(quick_filters)
    gs.save()

    for fieldname in removed_filters:
        QuickFilterOverride.objects.update_or_create(
            doctype_label=doctype, fieldname=fieldname, defaults={"in_standard_filter": False}
        )
    for fieldname in new_filters:
        QuickFilterOverride.objects.update_or_create(
            doctype_label=doctype, fieldname=fieldname, defaults={"in_standard_filter": True}
        )


def _virtual_field_values(doctype: str, names: list, want: set) -> dict:
    """{name: {"_assign": [...], "_liked_by": [...], ...}} for the rows we're
    about to return -- these aren't real columns, so they're computed
    separately and merged in, same as Frappe injects them onto every doc."""
    from apps.core.doctype.liked_document.liked_document import LikedDocument
    from apps.core.doctype.todo.todo import ToDo

    out = {n: {} for n in names}
    if "_assign" in want:
        rows = ToDo.objects.filter(
            reference_type=doctype, reference_name__in=names, status="Open"
        ).values_list("reference_name", "allocated_to_id")
        for name, user_id in rows:
            out[name].setdefault("_assign", []).append(user_id)
        for n in names:
            out[n]["_assign"] = json.dumps(out[n].get("_assign", []))
    if "_liked_by" in want:
        rows = LikedDocument.objects.filter(
            reference_doctype=doctype, reference_name__in=names
        ).values_list("reference_name", "user_id")
        for name, user_id in rows:
            out[name].setdefault("_liked_by", []).append(user_id)
        for n in names:
            out[n]["_liked_by"] = json.dumps(out[n].get("_liked_by", []))
    return out


def _attach_call_log_display(model, data: list, names: list) -> None:
    from apps.crm.doctype.call_log.call_log_api import parse_call_log, seconds_to_duration

    logs = {log.pk: log for log in model.objects.filter(pk__in=names)}
    for d in data:
        log = logs.get(d["name"])
        if not log:
            continue
        parsed = parse_call_log(
            {
                "type": log.type,
                "from_number": log.from_number,
                "to_number": log.to_number,
                "receiver": log.receiver_id,
                "caller": log.caller_id,
            }
        )
        d["_caller"] = parsed.get("_caller")
        d["_receiver"] = parsed.get("_receiver")
        d["_duration"] = seconds_to_duration(log.duration.total_seconds() if log.duration else 0)


def _apply_filters(model, doctype_label, filters, order_by, page_length, offset=0):
    qs = model.objects.filter(build_q(filters))
    if order_by:
        parts = []
        for part in order_by.split(","):
            part = part.strip()
            if not part:
                continue
            bits = part.split()
            field = bits[0]
            desc = len(bits) > 1 and bits[1].lower() == "desc"
            parts.append(f"-{field}" if desc else field)
        if parts:
            qs = qs.order_by(*parts)
    return qs[offset: offset + page_length] if page_length else qs


def get_data(
    doctype: str, filters: dict, order_by: str, page_length: int = 20, page_length_count: int = 20,
    column_field: str | None = None, title_field: str | None = None,
    columns=None, rows=None, kanban_columns=None, kanban_fields=None,
    view: dict | None = None, default_filters: dict | None = None, user=None,
):
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    model = get_doctype_model(doctype)
    if model is None:
        raise ValueError(f"Unknown doctype: {doctype}")

    filters = dict(filters or {})
    # The frontend's ViewControls.vue seeds these as "" (empty string, not
    # null) before a real view is loaded -- isinstance-only would try
    # json.loads("") and raise "Expecting value: line 1 column 1".
    rows = json.loads(rows) if isinstance(rows, str) and rows else (rows or [])
    columns = json.loads(columns) if isinstance(columns, str) and columns else (columns or [])
    kanban_fields = json.loads(kanban_fields) if isinstance(kanban_fields, str) and kanban_fields else (kanban_fields or [])
    kanban_columns = json.loads(kanban_columns) if isinstance(kanban_columns, str) and kanban_columns else (kanban_columns or [])

    custom_view_name = (view or {}).get("custom_view_name")
    view_type = (view or {}).get("view_type")
    group_by_field = (view or {}).get("group_by_field")

    filters = resolve_me(filters, user)
    if default_filters:
        filters.update(default_filters)

    is_default = True
    data = []
    defaults = default_list_data(doctype)
    default_rows = defaults["rows"]
    default_column_keys = [c["key"] for c in defaults["columns"]]

    fields_meta = _meta_field_map(doctype)
    custom_view = False

    if view_type != "kanban":
        if columns or rows:
            custom_view = True
            is_default = False

        if not columns:
            columns = [
                {"label": "Name", "type": "Data", "key": "name", "width": "16rem"},
                {"label": "Last Modified", "type": "Datetime", "key": "modified", "width": "8rem"},
            ]
        if not rows:
            rows = ["name"]

        standard_view = CRMViewSettings.objects.filter(
            dt=doctype, type=view_type or "list", is_standard=True, user_id=(user.pk if user else None)
        ).first()

        if not custom_view and standard_view:
            columns = json.loads(standard_view.columns or "[]")
            rows = json.loads(standard_view.rows or "[]")
            is_default = False
        elif not custom_view or is_default:
            rows = default_rows
            columns = defaults["columns"]

        visible_columns = []
        for column in columns:
            key = column.get("key")
            if key not in rows:
                rows.append(key)
            if key == "_liked_by" and column.get("width") == "10rem":
                column["width"] = "50px"
            visible_columns.append(column)
        columns = visible_columns

        if group_by_field and group_by_field not in rows:
            rows.append(group_by_field)

        real_rows = [r for r in rows if not r.startswith("_")]
        virtual_wanted = {r for r in rows if r.startswith("_")}

        # Every doctype's identifier is "name" by Frappe convention, and the
        # frontend reads row.name unconditionally -- but a couple of models
        # here (CRM Call Log) kept Django's default "id" pk instead. Query
        # under the real pk field name, then alias the value back to "name"
        # in the result so the row shape still matches every other doctype.
        pk_name = model._meta.pk.name
        qs = _apply_filters(model, doctype, filters, order_by, page_length)
        real_rows = [r for r in real_rows if r in fields_meta or r == "name"]
        query_rows = [pk_name if r == "name" else r for r in real_rows]
        data = list(qs.values(*query_rows))
        if pk_name != "name":
            for d in data:
                d["name"] = d.pop(pk_name)
        names = [d["name"] for d in data]
        virtuals = _virtual_field_values(doctype, names, virtual_wanted)
        for d in data:
            d.update(virtuals.get(d["name"], {}))
        if doctype == "CRM Call Log":
            _attach_call_log_display(model, data, names)

    if view_type == "kanban":
        if not rows:
            rows = default_rows

        if not kanban_columns and column_field:
            field_meta = fields_meta.get(column_field, {})
            if field_meta.get("fieldtype") == "Link":
                related = get_doctype_model(field_meta["options"])
                if related:
                    ordering = lookup_order_field(related)
                    kanban_columns = [{"name": n} for n in related.objects.order_by(ordering).values_list("pk", flat=True)]
                else:
                    kanban_columns = []
            elif field_meta.get("fieldtype") == "Select":
                kanban_columns = [{"name": o} for o in field_meta.get("options", "").split("\n") if o]

        kdefaults = default_kanban_settings(doctype) or {}
        if not title_field:
            title_field = kdefaults.get("title_field", "name")
        if title_field not in rows:
            rows.append(title_field)
        if not kanban_fields:
            kanban_fields = kdefaults.get("kanban_fields", ["name"])
        for f in kanban_fields:
            if f not in rows:
                rows.append(f)

        real_rows = [r for r in rows if not r.startswith("_") and (r in fields_meta or r == "name")]
        virtual_wanted = {r for r in rows if r.startswith("_")}

        for kc in kanban_columns:
            column_filters = dict(filters)
            if column_field and kc.get("name"):
                column_filters[column_field] = kc["name"]

            if kc.get("delete"):
                column_data = []
                all_count = 0
            else:
                page_len = kc.get("page_length", 20)
                col_qs = _apply_filters(model, doctype, column_filters, order_by, page_len)
                column_data = list(col_qs.values(*real_rows))
                names = [d["name"] for d in column_data]
                virtuals = _virtual_field_values(doctype, names, virtual_wanted)
                for d in column_data:
                    d.update(virtuals.get(d["name"], {}))
                all_count = model.objects.filter(build_q(column_filters)).count()
                kc["all_count"] = all_count
                kc["count"] = len(column_data)

            data.append({"column": kc, "fields": kanban_fields, "data": column_data})

    fields_list = list(fields_meta.values())
    std_fields = [
        {"label": "Name", "fieldtype": "Data", "fieldname": "name"},
        {"label": "Created On", "fieldtype": "Datetime", "fieldname": "creation"},
        {"label": "Last Modified", "fieldtype": "Datetime", "fieldname": "modified"},
        {"label": "Modified By", "fieldtype": "Link", "fieldname": "modified_by", "options": "User"},
        {"label": "Assigned To", "fieldtype": "Text", "fieldname": "_assign"},
        {"label": "Owner", "fieldtype": "Link", "fieldname": "owner", "options": "User"},
        {"label": "Like", "fieldtype": "Data", "fieldname": "_liked_by"},
    ]
    for f in std_fields:
        if f["fieldname"] not in rows:
            rows.append(f["fieldname"])
        if f not in fields_list:
            fields_list.append(f)

    if not is_default and custom_view_name:
        cv = CRMViewSettings.objects.filter(pk=custom_view_name).first()
        is_default = bool(cv and cv.load_default_columns)

    group_by_result = None
    if group_by_field and view_type == "group_by":
        field = fields_meta.get(group_by_field)
        if field:
            if field.get("fieldtype") == "Select":
                options = [o for o in (field.get("options") or "").split("\n") if o]
            else:
                values = [d.get(group_by_field) for d in data]
                has_empty = any(not v for v in values)
                options = sorted({v for v in values if v})
                if has_empty:
                    options.append("")
            group_by_result = {
                "label": field.get("label"), "fieldname": group_by_field,
                "fieldtype": field.get("fieldtype"), "options": options,
            }

    total_count = model.objects.filter(build_q(filters)).count()

    return {
        "data": data, "columns": columns, "rows": rows, "fields": fields_list,
        "column_field": column_field, "title_field": title_field,
        "kanban_columns": kanban_columns, "kanban_fields": kanban_fields,
        "group_by_field": group_by_result, "page_length": page_length,
        "page_length_count": page_length_count, "is_default": is_default,
        "views": get_views(doctype, user), "total_count": total_count,
        "row_count": len(data), "form_script": None, "list_script": None,
        "view_type": view_type,
    }


def get_views(doctype: str, user=None) -> list:
    from apps.crm.doctype.view_settings.view_settings import CRMViewSettings

    qs = CRMViewSettings.objects.filter(dt=doctype)
    if user:
        from django.db.models import Q as DjQ

        qs = qs.filter(DjQ(user__isnull=True) | DjQ(user=user))
    # Named fields (not bare .values()) so the "user" FK keys as "user", not
    # Django's default "user_id" -- matches view_settings_api._serialize()
    # and the general Link-field convention (see doc_api._apply_filters).
    fieldnames = [f.name for f in CRMViewSettings._meta.get_fields() if hasattr(f, "attname")]
    return list(qs.values(*fieldnames))


def get_assigned_users(doctype: str, name: str) -> list:
    from apps.core.doctype.todo.todo import ToDo

    return list(
        ToDo.objects.filter(reference_type=doctype, reference_name=name)
        .exclude(status__in=["Closed", "Cancelled"])
        .values_list("allocated_to_id", flat=True)
        .distinct()
    )


def add_seen(doctype: str, name: str, user):
    from apps.core.doctype.seen_document.seen_document import add_seen as _add_seen

    _add_seen(user, doctype, name)


def get_fields(doctype: str) -> list:
    return list(_meta_field_map(doctype).values())


def get_counts(doctype: str, name: str) -> dict:
    from apps.crm.doctype.note.note import FCRMNote
    from apps.crm.doctype.task.task import CRMTask

    return {
        "_task_count": CRMTask.objects.filter(reference_doctype=doctype, reference_docname=name).count(),
        "_note_count": FCRMNote.objects.filter(reference_doctype=doctype, reference_docname=name).count(),
    }


# Ported from Frappe's generic frappe.client module -- these aren't CRM-specific
# RPCs, but frontend code (data/document.js) calls them by that fixed name
# regardless of doctype, so they live alongside the other doc-level endpoints.

def get_doc_permissions(doctype: str, docname: str, user) -> dict:
    """We have no per-role permission engine (Frappe's Role/DocPerm tables) to
    port from -- permissions here are the same superuser/staff/owner rule
    used throughout this port (see view_settings_api._check_permission).
    Every authenticated user can read/write/create; delete is restricted."""
    model = get_doctype_model(doctype)
    is_owner = False
    has_owner_field = model is not None and any(f.name == "owner" for f in model._meta.get_fields())
    if has_owner_field and docname:
        owner_id = model.objects.filter(pk=docname).values_list("owner_id", flat=True).first()
        is_owner = owner_id is not None and user is not None and owner_id == user.pk
    can_delete = bool(user and (user.is_superuser or user.is_staff or is_owner))
    return {"permissions": {"read": 1, "write": 1, "create": 1, "delete": 1 if can_delete else 0, "email": 1, "share": 1, "print": 1}}


def get_value(doctype: str, filters, fieldname) -> dict:
    """filters is the linked doc's name (a Link field's value); fieldname is a
    single fieldname or list of fieldnames to read off it -- used by
    fetch_from support (utils/fetchFrom.js)."""
    model = get_doctype_model(doctype)
    if model is None:
        return {}
    fieldnames = fieldname if isinstance(fieldname, list) else [fieldname]
    name = filters if isinstance(filters, str) else (filters or {}).get("name")
    if not name:
        return {}
    row = model.objects.filter(pk=name).values(*fieldnames).first()
    return row or {}


# Generic port of frappe.rename_doc for our name-as-primary-key doctypes
# (e.g. CRM Service Level Agreement's autoname is field:sla_name, so
# editing the name means literally changing the row's primary key). Django
# FKs don't ON UPDATE CASCADE, and some back-references use
# related_name="+" (hidden, excluded from model._meta.related_objects), so
# this scans every installed model's fields directly rather than relying on
# reverse relation discovery, matching frappe's own "rename everywhere this
# doctype is linked" behaviour.
def rename_doc(doctype: str, old_name: str, new_name: str) -> dict:
    from django.apps import apps as django_apps
    from django.db import transaction
    from django.db.models import ForeignKey

    model = get_doctype_model(doctype)
    if model is None:
        raise ValueError(f"Unknown doctype '{doctype}'")
    if not old_name or not new_name:
        raise ValueError("old_name and new_name are required")
    if not model.objects.filter(pk=old_name).exists():
        raise ValueError(f"{doctype} {old_name} not found")
    if old_name != new_name and model.objects.filter(pk=new_name).exists():
        raise ValueError(f"{doctype} {new_name} already exists")

    pk_field = model._meta.pk.name
    with transaction.atomic():
        for other_model in django_apps.get_models():
            for field in other_model._meta.get_fields():
                if isinstance(field, ForeignKey) and field.remote_field.model is model:
                    other_model.objects.filter(**{field.attname: old_name}).update(**{field.attname: new_name})
        model.objects.filter(pk=old_name).update(**{pk_field: new_name})
    return {"name": new_name}


# Ported from frappe.desk.form.assign_to (frappe/frappe, MIT) -- the generic
# ToDo-backed assignment RPCs every doctype's Link/Assign-To UI calls by this
# fixed name, doctype-agnostic. Mirrors apps/core/assignable.py's per-model
# assign_agent/unassign_agent but works directly off reference_type/name so
# bulk multi-doctype calls don't need to load each model instance.
def assign_to_add(doctype: str, name: str, assign_to: list, bulk_assign: bool = False, re_assign: bool = False) -> None:
    from apps.core.doctype.todo.todo import ToDo
    from apps.core.middleware import get_current_user

    assigned_by = get_current_user()
    for user_id in assign_to:
        if ToDo.objects.filter(
            reference_type=doctype, reference_name=name, allocated_to_id=user_id, status="Open"
        ).exists():
            continue
        ToDo.objects.create(
            allocated_to_id=user_id, reference_type=doctype, reference_name=name,
            description=f"Assignment for {doctype} {name}", status="Open",
            assigned_by=assigned_by if assigned_by and getattr(assigned_by, "is_authenticated", False) else None,
        )
        from apps.crm.notifications_api import notify_assignment

        notify_assignment(assigned_by, user_id, doctype, name, f"Assigned a {doctype} {name} to you")


def assign_to_add_multiple(doctype: str, name, assign_to: list, bulk_assign: bool = False, re_assign: bool = False) -> None:
    names = json.loads(name) if isinstance(name, str) else name
    for docname in names:
        assign_to_add(doctype, docname, assign_to, bulk_assign, re_assign)


def remove_assignments(doctype: str, name: str, assignees) -> None:
    from apps.core.doctype.todo.todo import ToDo

    names = json.loads(assignees) if isinstance(assignees, str) else assignees
    ToDo.objects.filter(
        reference_type=doctype, reference_name=name, allocated_to_id__in=names, status="Open"
    ).update(status="Cancelled")


def assign_to_remove_multiple(doctype: str, names, ignore_permissions: bool = True) -> None:
    from apps.core.doctype.todo.todo import ToDo

    docnames = json.loads(names) if isinstance(names, str) else names
    ToDo.objects.filter(reference_type=doctype, reference_name__in=docnames, status="Open").update(status="Cancelled")


# Ported from frappe.desk.doctype.bulk_update.bulk_update.submit_cancel_or_update_docs
# (frappe/frappe, MIT) -- generic bulk field-value update across a set of
# records. The original enqueues a background job for >=20 records; this port
# always runs synchronously (no job queue integration exists here) and
# returns the list of docnames that failed, matching the response shape the
# frontend's EditValueModal.vue already branches on.
def bulk_update_docs(doctype: str, docnames: list, data: dict) -> list:
    model = get_doctype_model(doctype)
    if model is None:
        return list(docnames)

    failed = []
    for docname in docnames:
        try:
            obj = model.objects.get(pk=docname)
            for field, value in data.items():
                setattr(obj, f"{field}_id" if hasattr(obj, f"{field}_id") else field, value)
            obj.save()
        except Exception:
            failed.append(docname)
    return failed


# Ported from crm/api/doc.py's get_linked_docs_of_document /
# remove_linked_doc_reference / delete_bulk_docs (frappe/crm, AGPL-3.0).
# Frappe finds "linked docs" via get_linked_docs/get_dynamic_linked_docs,
# which reflect over every installed doctype's Link/Dynamic Link fields --
# there's no such registry here, so this scans our curated doctype_registry
# instead (see list_doctype_labels' docstring).
def get_linked_docs_of_document(doctype: str, docname: str) -> list:
    from apps.crm.doctype_registry import list_doctype_labels

    model = get_doctype_model(doctype)
    if model is None or not model.objects.filter(pk=docname).exists():
        return []

    results = []
    for label in list_doctype_labels():
        if label == doctype:
            continue
        other_model = get_doctype_model(label)
        if other_model is None:
            continue
        meta = get_doctype_meta(label) or {"fields": []}
        link_fields = [f["fieldname"] for f in meta["fields"] if f["fieldtype"] == "Link" and f.get("options") == doctype]
        for fieldname in link_fields:
            for obj in other_model.objects.filter(**{fieldname: docname})[:50]:
                results.append({
                    "doc": label, "title": str(obj),
                    "reference_docname": str(obj.pk), "reference_doctype": label,
                })
    return results


def remove_linked_doc_reference(items, remove_contact: bool = False, delete: bool = False) -> str:
    items = json.loads(items) if isinstance(items, str) else items
    for item in items or []:
        doctype, docname = item.get("doctype"), item.get("docname")
        if not doctype or not docname:
            continue
        model = get_doctype_model(doctype)
        if model is None:
            continue
        obj = model.objects.filter(pk=docname).first()
        if obj is None:
            continue
        if delete:
            obj.delete()
    return "success"


def delete_bulk_docs(doctype: str, items, delete_linked: bool = False) -> list:
    """Returns docnames that could not be deleted (e.g. protected by another
    record's on_delete=PROTECT) -- the original enqueues a background job and
    reports failures via the error log instead; we run synchronously and
    return them directly since there's no job queue integration here."""
    from django.db.models import ProtectedError

    model = get_doctype_model(doctype)
    if model is None:
        return list(items) if isinstance(items, list) else json.loads(items)

    items = json.loads(items) if isinstance(items, str) else items
    failed = []
    for docname in items:
        obj = model.objects.filter(pk=docname).first()
        if obj is None:
            continue
        try:
            obj.delete()
        except ProtectedError:
            failed.append(docname)
    return failed


def get_file_uploader_defaults(doctype: str) -> dict:
    # Frappe reads these from System Settings; we have no such settings
    # doctype, so these are fixed, generous defaults (no allow-list, 10MB cap).
    return {
        "allowed_file_types": "",
        "max_file_size": 10 * 1024 * 1024,
        "max_number_of_files": 10,
        "make_attachments_public": 0,
    }


def delete_attachment(doctype: str, docname: str, file_url: str) -> None:
    # No file-storage/attachment model exists in this port yet (no uploads
    # subsystem has been built) -- nothing to delete. A safe no-op rather
    # than a 404, matching the original's "best-effort" framing
    # (useAttachments.js already only logs on failure, never blocks the UI).
    return None
