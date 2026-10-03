# Ported from crm/fcrm/doctype/crm_fields_layout/crm_fields_layout.py (frappe/crm, AGPL-3.0).
#
# Frappe's version also enforces field-level "permlevel" restrictions
# (handle_perm_level_restrictions / get_permlevel_access), reading them off
# each field's role-permission rows. We have no permlevel concept anywhere in
# this port (apps/core/meta.py's generic field metadata doesn't carry one),
# so that step is dropped entirely rather than faked -- every field in a
# saved layout is shown as read/write to any authenticated user, same as the
# rest of this port's simplified permission model.
from __future__ import annotations

import json
import secrets

from django.core.exceptions import PermissionDenied

NOT_ALLOWED_SIDEPANEL_FIELDTYPES = {"Tab Break", "Section Break", "Column Break"}


def _random_string(n=4) -> str:
    return secrets.token_hex(n // 2 + 1)[:n]


def _get_layout_doc(doctype: str, type_: str):
    from apps.crm.doctype.fields_layout.fields_layout import CRMFieldsLayout

    return CRMFieldsLayout.objects.filter(dt=doctype, type=type_).first()


def get_default_layout(doctype: str) -> list:
    """Frappe derives this from the doctype's own Tab/Section/Column Break
    fields, which are part of its field list. Our generic meta
    (apps.core.meta.get_doctype_meta) never emits those fieldtypes -- Django
    models have no such markers -- so every field lands in one flat
    tab/section/column. Real structure comes from a saved layout (see the
    seed data in apps/crm/migrations for CRM Lead/CRM Deal's Quick Entry)."""
    from apps.core.meta import get_doctype_meta

    meta = get_doctype_meta(doctype) or {"fields": []}
    fieldnames = [f["fieldname"] for f in meta["fields"]]

    return [{
        "name": "tab_" + _random_string(),
        "sections": [{
            "name": "section_" + _random_string(),
            "columns": [{"name": "column_" + _random_string(), "fields": fieldnames}],
        }],
    }]


def get_fields_layout(doctype: str, type: str, parent_doctype: str | None = None) -> list:
    from apps.core.meta import get_doctype_meta

    doc = _get_layout_doc(doctype, type)
    tabs = json.loads(doc.layout) if doc and doc.layout else []

    if not tabs and type != "Required Fields":
        tabs = get_default_layout(doctype)

    has_tabs = isinstance(tabs, list) and len(tabs) > 0 and isinstance(tabs[0], dict) and any(
        "sections" in tab for tab in tabs
    )
    if not has_tabs:
        tabs = [{"name": "first_tab", "sections": tabs}]

    meta = get_doctype_meta(doctype) or {"fields": []}
    fields_by_name = {f["fieldname"]: f for f in meta["fields"]}

    required_fields = []
    if type == "Required Fields":
        required_fields = [f for f in meta["fields"] if f.get("reqd")]

    for tab in tabs:
        for section in tab.get("sections") or []:
            section["columns"] = [c for c in (section.get("columns") or []) if c]
            for column in section["columns"]:
                fieldnames = [fn for fn in (column.get("fields") or []) if fn]
                resolved = []
                for fn in fieldnames:
                    field = fields_by_name.get(fn)
                    if not field:
                        continue
                    resolved.append(dict(field))
                    if type == "Required Fields" and field.get("reqd"):
                        required_fields = [rf for rf in required_fields if rf["fieldname"] != fn]
                column["fields"] = resolved

    if type == "Required Fields" and required_fields and tabs:
        tabs[-1]["sections"].append({
            "label": "Required Fields",
            "name": "required_fields_section_" + _random_string(),
            "opened": True,
            "hideLabel": True,
            "columns": [{
                "name": "required_fields_column_" + _random_string(),
                "fields": [dict(f) for f in required_fields],
            }],
        })

    return tabs or []


def get_sidepanel_sections(doctype: str) -> list:
    from apps.core.meta import get_doctype_meta

    doc = _get_layout_doc(doctype, "Side Panel")
    if not doc or not doc.layout:
        return []
    layout = json.loads(doc.layout)

    meta = get_doctype_meta(doctype) or {"fields": []}
    fields_by_name = {
        f["fieldname"]: f for f in meta["fields"] if f["fieldtype"] not in NOT_ALLOWED_SIDEPANEL_FIELDTYPES
    }

    for section in layout:
        section["name"] = section.get("name") or section.get("label")
        for column in section.get("columns") or []:
            fieldnames = [fn for fn in (column.get("fields") or []) if fn]
            resolved = []
            for fn in fieldnames:
                field = fields_by_name.get(fn)
                if field:
                    resolved.append(_get_field_obj(dict(field)))
            column["fields"] = resolved

    return layout


def _get_field_obj(field: dict) -> dict:
    label = field.get("label") or field.get("fieldname")
    if not field.get("placeholder"):
        if field.get("fieldtype") in ("Link", "Select"):
            field["placeholder"] = f"Select {label}..."
        else:
            field["placeholder"] = f"Add {label}..."
    if field.get("fieldtype") == "Select" and field.get("options"):
        field["options"] = [{"label": o, "value": o} for o in field["options"].split("\n") if o]
    if field.get("read_only"):
        field["tooltip"] = "This field is read only and cannot be edited."
    return field


def save_fields_layout(doctype: str, type: str, layout: str, user) -> str:
    from apps.crm.doctype.fields_layout.fields_layout import CRMFieldsLayout

    if not (user.is_superuser or user.is_staff):
        raise PermissionDenied("Not permitted to modify fields layout")

    doc = _get_layout_doc(doctype, type)
    if doc is None:
        doc = CRMFieldsLayout(dt=doctype, type=type)
    doc.layout = layout
    doc.save()
    return doc.layout
