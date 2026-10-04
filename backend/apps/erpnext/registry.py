from __future__ import annotations

import json
import re
from functools import lru_cache
from importlib import import_module
from pathlib import Path

from django.apps import apps
from django.conf import settings


@lru_cache(maxsize=1)
def _meta_by_doctype():
    result = {}
    _doctype_app.clear()
    for app in ("erpnext", "hrms"):
        base = Path(settings.BASE_DIR) / "apps" / app
        for path in base.glob("*/doctype/*/*.json"):
            with path.open(encoding="utf-8") as handle:
                meta = json.load(handle)
            result[meta["name"]] = meta
            _doctype_app[meta["name"]] = app
    return result


_doctype_app: dict = {}


_overlay_cache: dict = {}


def _customization_token(doctype: str):
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT "
            "(SELECT count(*) FROM \"tabProperty Setter\" WHERE doc_type = %s), "
            "(SELECT coalesce(max(modified)::text, '') FROM \"tabProperty Setter\" WHERE doc_type = %s), "
            "(SELECT count(*) FROM \"tabCustom Field\" WHERE dt = %s), "
            "(SELECT coalesce(max(modified)::text, '') FROM \"tabCustom Field\" WHERE dt = %s)",
            [doctype, doctype, doctype, doctype],
        )
        return cursor.fetchone()


def _cast_property(property_type, value):
    from apps.frappe.utils.data import cint, flt

    if property_type in ("Int", "Check"):
        return cint(value)
    if property_type in ("Float", "Currency", "Percent"):
        return flt(value)
    return value


def _custom_field_to_df(row) -> dict:
    skip = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "dt", "insert_after"}
    df = {}
    for field in row._meta.fields:
        if field.name in skip:
            continue
        value = getattr(row, field.name)
        if value in (None, ""):
            continue
        df[field.name] = float(value) if hasattr(value, "as_tuple") else value
    df["is_custom_field"] = 1
    return df


def _apply_customizations(doctype: str, base: dict, token) -> dict:
    import copy

    meta = copy.deepcopy(base)
    if token[2]:
        rows = list(get_model_unsynced("Custom Field").objects.filter(dt=doctype).order_by("idx", "creation"))
        for row in rows:
            df = _custom_field_to_df(row)
            fields = meta.setdefault("fields", [])
            names = [field.get("fieldname") for field in fields]
            anchor = row.insert_after
            if anchor and anchor in names:
                fields.insert(names.index(anchor) + 1, df)
            else:
                fields.append(df)
    if token[0]:
        property_rows = list(get_model_unsynced("Property Setter").objects.filter(doc_type=doctype).order_by("creation"))
        fields_by_name = {field.get("fieldname"): field for field in meta.get("fields", [])}
        for row in property_rows:
            value = _cast_property(row.property_type, row.value)
            if row.doctype_or_field == "DocField" and row.field_name in fields_by_name:
                fields_by_name[row.field_name][row.property] = value
            elif row.doctype_or_field == "DocType":
                meta[row.property] = value
    return meta


def get_meta(doctype: str) -> dict:
    meta = _meta_by_doctype().get(doctype)
    if meta is None:
        raise KeyError(f"Unknown doctype: {doctype}")
    if doctype in ("Property Setter", "Custom Field"):
        return meta
    token = _customization_token(doctype)
    cached = _overlay_cache.get(doctype)
    if cached is not None and cached[0] == token:
        return cached[1]
    result = _apply_customizations(doctype, meta, token) if (token[0] or token[2]) else meta
    _overlay_cache[doctype] = (token, result)
    return result


def list_doctypes() -> list[str]:
    return sorted(_meta_by_doctype())


def get_model_unsynced(doctype: str):
    for app_label in ("erpnext", "hrms"):
        for model in apps.get_app_config(app_label).get_models():
            if getattr(model, "doctype", None) == doctype or str(model._meta.verbose_name) == doctype:
                return model
    table = f"tab{doctype}"
    for model in apps.get_app_config("frappe").get_models():
        if model._meta.db_table == table:
            return model
    raise LookupError(f"Unknown doctype model: {doctype}")


def get_model(doctype: str):
    model = get_model_unsynced(doctype)
    if doctype in ("Property Setter", "Custom Field"):
        return model
    from apps.frappe.custom.sync import sync_model

    sync_model(model, _customization_token(doctype))
    return model


def module_name(value):
    return re.sub(r"[^0-9A-Za-z]+", "_", value.lower()).strip("_")


def class_name(value):
    return re.sub(r"[^0-9A-Za-z]", "", value.title())


def get_controller(doctype: str):
    meta = get_meta(doctype)
    mod = module_name(meta.get("module") or "core")
    dt_module = module_name(doctype)
    app = _doctype_app.get(doctype, "erpnext")
    module = import_module(f"apps.{app}.{mod}.doctype.{dt_module}.{dt_module}")
    exact = re.sub(r"[^0-9A-Za-z]", "", doctype)
    return getattr(module, exact, None) or getattr(module, class_name(doctype))
