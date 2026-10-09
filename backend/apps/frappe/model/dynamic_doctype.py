from __future__ import annotations

import copy
import re

from django.apps import apps
from django.db import connection, models

import frappe
from apps.frappe.model.field_types import django_field, has_column

APP_LABEL = "erpnext"
SCALAR_SKIP = {"fields", "permissions", "actions", "links", "states", "doctype", "flags", "_meta"}
CHILD_TABLES = ("fields", "permissions", "actions", "links", "states")


def model_class_name(doctype: str) -> str:
    return "Dyn" + re.sub(r"[^0-9A-Za-z]", "", doctype.title())


def table_name(doctype: str) -> str:
    return f"tab{doctype}"


def base_class(meta: dict):
    from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel

    if meta.get("istable"):
        return FrappeChildModel
    if meta.get("is_tree"):
        return FrappeTreeModel
    return FrappeModel


def needs_table(meta: dict) -> bool:
    return not (meta.get("issingle") or meta.get("is_virtual"))


def column_fields(meta: dict) -> dict:
    result = {}
    for df in meta.get("fields", []):
        fieldname = df.get("fieldname")
        if fieldname and has_column(df) and fieldname not in result:
            result[fieldname] = df
    return result


def field_attribute(fieldname: str) -> str:
    from apps.erpnext.management.commands.generate_doctypes import field_name

    return field_name(fieldname)


def sequence_name(doctype: str) -> str:
    return frappe.scrub(f"{doctype}_id_seq")


def ensure_sequence(meta: dict) -> None:
    if meta.get("autoname") != "autoincrement":
        return
    with connection.cursor() as cursor:
        cursor.execute(f'CREATE SEQUENCE IF NOT EXISTS "{sequence_name(meta["name"])}" START WITH 1 INCREMENT BY 1')


def drop_sequence(doctype: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute(f'DROP SEQUENCE IF EXISTS "{sequence_name(doctype)}"')


def drop_model(doctype: str) -> None:
    key = model_class_name(doctype).lower()
    apps.all_models[APP_LABEL].pop(key, None)
    apps.clear_cache()


def build_model(meta: dict):
    doctype = meta["name"]
    drop_model(doctype)
    base = base_class(meta)
    reserved = {field.name for field in base._meta.get_fields()}
    sort_field = meta.get("sort_field") or "modified"
    ordering = f"-{sort_field}" if str(meta.get("sort_order") or "DESC").upper() == "DESC" else sort_field
    attrs = {"__module__": "apps.frappe.model.dynamic_doctype", "doctype": doctype}
    if meta.get("is_submittable") and not any(df.get("fieldname") == "amended_from" for df in meta.get("fields", [])):
        attrs["amended_from"] = models.CharField(max_length=140, blank=True, default="")
    if meta.get("track_seen"):
        attrs["_seen"] = models.TextField(null=True, blank=True)
    for fieldname, df in column_fields(meta).items():
        attribute = field_attribute(fieldname)
        if attribute in reserved or attribute == "amended_from" and "amended_from" in attrs:
            continue
        attrs[attribute] = django_field(df)
    attrs["Meta"] = type(
        "Meta",
        (),
        {
            "app_label": APP_LABEL,
            "db_table": table_name(doctype),
            "verbose_name": doctype,
            "ordering": [ordering],
        },
    )
    return type(model_class_name(doctype), (base,), attrs)


def existing_columns(table: str) -> set[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s AND table_schema = current_schema()",
            [table],
        )
        return {row[0] for row in cursor.fetchall()}


def sync_table(model) -> None:
    table = model._meta.db_table
    present = existing_columns(table)
    with connection.schema_editor() as editor:
        if not present:
            editor.create_model(model)
            return
        for field in model._meta.local_fields:
            if field.column not in present:
                editor.add_field(model, field)


def drop_table(doctype: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute(f'DROP TABLE IF EXISTS "{table_name(doctype)}" CASCADE')


def register_meta(meta: dict) -> None:
    from apps.erpnext import registry

    registry._meta_by_doctype()[meta["name"]] = meta
    registry._doctype_app[meta["name"]] = APP_LABEL
    registry._overlay_cache.pop(meta["name"], None)


def unregister_meta(doctype: str) -> None:
    from apps.erpnext import registry

    registry._meta_by_doctype().pop(doctype, None)
    registry._doctype_app.pop(doctype, None)
    registry._overlay_cache.pop(doctype, None)


def activate(meta: dict, create_table: bool = True):
    register_meta(meta)
    if not needs_table(meta):
        return None
    model = build_model(meta)
    if create_table:
        sync_table(model)
        ensure_sequence(meta)
    return model


def persist(meta: dict) -> None:
    from django.utils import timezone

    from apps.frappe.models import DocFieldTable, DocPerm, DocTypeTable

    name = meta["name"]
    now = timezone.now()
    DocFieldTable.objects.filter(parent=name).delete()
    DocPerm.objects.filter(parent=name, parenttype="DocType").delete()
    DocTypeTable.objects.filter(name=name).delete()
    columns = {field.name for field in DocTypeTable._meta.fields}
    values = {}
    for key, value in meta.items():
        if key in columns and key not in SCALAR_SKIP and not isinstance(value, (list, dict)) and value is not None:
            values[key] = int(value) if isinstance(value, bool) else value
    values.update(name=name, creation=now, modified=now, custom=1, idx=0)
    for key in ("autoname", "naming_rule", "title_field", "sort_field", "sort_order", "module"):
        if values.get(key) is None:
            values[key] = ""
    DocTypeTable.objects.create(**values)
    field_columns = {field.name for field in DocFieldTable._meta.fields}
    for index, df in enumerate(meta.get("fields", []), start=1):
        row = {}
        for key, value in df.items():
            if key in field_columns and value is not None and key not in ("name", "parent", "idx", "creation", "modified"):
                row[key] = int(value) if isinstance(value, bool) else (str(value) if isinstance(value, (list, dict)) else value)
        for key in ("length", "columns", "permlevel"):
            if key in row:
                try:
                    row[key] = int(row[key])
                except (TypeError, ValueError):
                    row[key] = 0
        if "precision" in row:
            row["precision"] = str(row["precision"])
        row.setdefault("fieldname", "")
        row.update(name=f"{name}-{df.get('fieldname')}-{index}", parent=name, idx=index, creation=now, modified=now)
        DocFieldTable.objects.create(**row)
    perm_columns = {field.name for field in DocPerm._meta.fields}
    for index, perm in enumerate(meta.get("permissions", []), start=1):
        row = {key: value for key, value in perm.items() if key in perm_columns and value is not None and key not in ("name", "parent", "idx")}
        row.update(name=f"{name}-perm-{index}", parent=name, parenttype="DocType", parentfield="permissions", idx=index)
        DocPerm.objects.create(**row)


def remove(doctype: str) -> None:
    from apps.frappe.models import DocFieldTable, DocPerm, DocTypeTable

    DocFieldTable.objects.filter(parent=doctype).delete()
    DocPerm.objects.filter(parent=doctype, parenttype="DocType").delete()
    DocTypeTable.objects.filter(name=doctype).delete()
    unregister_meta(doctype)
    drop_model(doctype)
    drop_table(doctype)
    drop_sequence(doctype)


def meta_from_rows(row) -> dict:
    from apps.frappe.models import DocFieldTable, DocPerm, DocTypeTable

    meta = {}
    for field in DocTypeTable._meta.fields:
        value = getattr(row, field.name)
        if value is None or field.name in ("creation", "modified"):
            continue
        meta[field.name] = value
    meta["doctype"] = "DocType"
    fields = []
    for field_row in DocFieldTable.objects.filter(parent=row.name).order_by("idx"):
        df = {}
        for field in DocFieldTable._meta.fields:
            if field.name in ("name", "parent", "parenttype", "parentfield", "creation", "modified", "idx"):
                continue
            value = getattr(field_row, field.name)
            if value not in (None, ""):
                df[field.name] = value
        fields.append(df)
    meta["fields"] = fields
    meta["permissions"] = [
        {key: getattr(perm, key) for key in ("role", "permlevel", "read", "write", "create", "delete", "submit", "cancel", "amend", "report", "export", "share", "print", "email", "select", "if_owner")}
        for perm in DocPerm.objects.filter(parent=row.name, parenttype="DocType").order_by("idx")
    ]
    return meta


def load_all() -> int:
    from apps.frappe.models import DocTypeTable

    count = 0
    for row in DocTypeTable.objects.filter(custom=1):
        meta = meta_from_rows(row)
        activate(meta, create_table=False)
        count += 1
    return count


def to_meta(doc) -> dict:
    meta = {}
    for key, value in doc.__dict__.items():
        if key.startswith("_") or key in SCALAR_SKIP or isinstance(value, (list, dict)) or callable(value):
            continue
        meta[key] = value
    meta["name"] = doc.name
    meta["doctype"] = "DocType"
    for table in CHILD_TABLES:
        rows = doc.get(table) or []
        meta[table] = [copy.deepcopy(dict(row)) if isinstance(row, dict) else copy.deepcopy(row.as_dict()) for row in rows]
    return meta


def create_or_update(doc) -> None:
    meta = to_meta(doc)
    meta["custom"] = 1
    persist(meta)
    activate(meta)
    frappe.clear_cache(doctype=meta["name"])
