from __future__ import annotations

import json

from django.core.exceptions import ValidationError

import frappe
from apps.core.doctype.web_form.web_form import ALLOWED_DOCTYPES, FORM_MODULE

ALLOWED_DOCTYPE_LABELS = [c[0] for c in ALLOWED_DOCTYPES]

SUPPORTED_FIELDTYPES = (
    "Data", "Small Text", "Text", "Long Text", "Text Editor", "HTML Editor", "Markdown Editor",
    "Select", "Link", "Int", "Float", "Currency", "Percent", "Check", "Date", "Datetime", "Time",
    "Phone", "Color",
)

DENIED_FIELDNAMES = (
    "naming_series", "status", "lead_name", "converted", "sla_status", "response_by",
    "first_response_time", "first_responded_on", "facebook_form_id", "facebook_lead_id",
)

LAYOUT_BREAKS = ("Section Break", "Column Break")

SEED_LAYOUT = {
    "CRM Lead": [
        {"label": "Personal Details", "columns": [["first_name", "email"], ["last_name", "phone"]]},
    ],
    "CRM Deal": [
        {"label": "Personal Details", "columns": [["first_name", "email"], ["last_name", "phone"]]},
        {"label": "Organization Details", "columns": [["organization_name"]]},
    ],
}


def ensure_form_source() -> str:
    from apps.erpnext.registry import get_model

    obj, _ = get_model("UTM Source").objects.get_or_create(pk="Web Form")
    return obj.pk


def _seeded_visible_fieldnames(document_type: str) -> set:
    names = set()
    for section in SEED_LAYOUT.get(document_type, []):
        for col in section["columns"]:
            names.update(col)
    return names


def guest_can_select(doctype: str) -> bool:
    return bool(
        frappe.db.exists("Custom DocPerm", {"parent": doctype, "role": "Guest", "permlevel": 0, "select": 1})
    )


def _link_target_doctypes() -> set:
    from apps.core.meta import get_doctype_meta

    targets = set()
    for document_type in ALLOWED_DOCTYPE_LABELS:
        meta = get_doctype_meta(document_type) or {"fields": []}
        for f in meta["fields"]:
            if f.get("fieldtype") == "Link" and f.get("options"):
                targets.add(f["options"])
    return targets


def _mappable_fields(document_type: str) -> list[dict]:
    from apps.core.meta import get_doctype_meta

    meta = get_doctype_meta(document_type) or {"fields": []}
    fields = []
    for f in meta["fields"]:
        if f.get("fieldtype") not in SUPPORTED_FIELDTYPES:
            continue
        if not f.get("fieldname") or f["fieldname"] in DENIED_FIELDNAMES:
            continue
        if f.get("hidden") or f.get("read_only"):
            continue
        fields.append({
            "fieldname": f["fieldname"], "label": f.get("label") or f["fieldname"],
            "fieldtype": f["fieldtype"], "options": f.get("options"),
            "reqd": bool(f.get("reqd")), "default": None,
        })
    return fields


def _default_status(document_type: str) -> str | None:
    from apps.crm.doctype_registry import get_doctype_model

    status_model = get_doctype_model("CRM Lead Status" if document_type == "CRM Lead" else "CRM Deal Status")
    if status_model is None:
        return None
    preferred = "New" if document_type == "CRM Lead" else "Qualification"
    if status_model.objects.filter(pk=preferred).exists():
        return preferred
    row = status_model.objects.filter(type="Open").first()
    return row.pk if row else None


def _seed_visible_fields(document_type: str) -> list[dict]:
    catalog = {f["fieldname"]: f for f in _mappable_fields(document_type)}

    def _break(fieldtype, i, label=""):
        prefix = "section_break" if fieldtype == "Section Break" else "column_break"
        return {"fieldname": f"{prefix}_seed{i}", "label": label, "fieldtype": fieldtype, "options": "", "reqd": 0, "placeholder": "", "field_description": ""}

    rows, n = [], 0
    for section in SEED_LAYOUT.get(document_type, []):
        n += 1
        rows.append(_break("Section Break", n, section.get("label") or ""))
        for ci, col in enumerate(section["columns"]):
            if ci > 0:
                n += 1
                rows.append(_break("Column Break", n))
            for fn in col:
                f = catalog.get(fn)
                if not f:
                    continue
                rows.append({
                    "fieldname": f["fieldname"], "label": f["label"], "fieldtype": f["fieldtype"],
                    "options": f["options"], "reqd": 1 if f["reqd"] else 0, "placeholder": "", "field_description": "",
                })
    return rows


def _seed_hidden_fields(document_type: str) -> list[dict]:
    from apps.core.meta import get_doctype_meta

    meta = get_doctype_meta(document_type) or {"fields": []}
    visible = _seeded_visible_fieldnames(document_type)
    hidden = []
    for f in meta["fields"]:
        if not f.get("reqd") or f["fieldname"] in visible:
            continue
        if f.get("fieldtype") in SUPPORTED_FIELDTYPES and f["fieldname"] not in DENIED_FIELDNAMES:
            continue
        default = _default_status(document_type) if f["fieldname"] == "status" else ""
        hidden.append({
            "fieldname": f["fieldname"], "label": f.get("label") or f["fieldname"],
            "fieldtype": f.get("fieldtype"), "options": f.get("options") or "", "default": default or "",
        })
    return hidden


def is_manager(user) -> bool:
    return bool(user and (user.is_superuser or user.is_staff))


def get_form_fields(document_type: str) -> list[dict]:
    if document_type not in ALLOWED_DOCTYPE_LABELS:
        raise ValueError(f"Forms can only map to: {', '.join(ALLOWED_DOCTYPE_LABELS)}")
    return _mappable_fields(document_type)


def get_hidden_seed(document_type: str) -> list[dict]:
    if document_type not in ALLOWED_DOCTYPE_LABELS:
        raise ValueError(f"Forms can only map to: {', '.join(ALLOWED_DOCTYPE_LABELS)}")
    return _seed_hidden_fields(document_type)


def link_field_guest_access(doctype: str) -> dict:
    return {"doctype": doctype, "guest_can_select": guest_can_select(doctype)}


def grant_guest_link_access(doctype: str) -> dict:
    from frappe.permissions import add_permission, update_permission_property

    if doctype not in _link_target_doctypes():
        raise ValueError(f"{doctype} isn't a linkable field on a CRM form.")
    add_permission(doctype, "Guest", 0)
    update_permission_property(doctype, "Guest", 0, "select", 1)
    return {"doctype": doctype, "guest_can_select": True}


def list_forms() -> list[dict]:
    rows = frappe.get_all(
        "Web Form",
        filters={"module": FORM_MODULE, "doc_type": ("in", ALLOWED_DOCTYPE_LABELS)},
        fields=["name", "title", "route", "doc_type", "crm_published", "modified"],
        order_by="modified desc",
        limit_page_length=0,
    )
    return [
        {
            "name": w.name, "title": w.title, "route": w.route, "document_type": w.doc_type,
            "published": bool(w.crm_published), "modified": w.modified,
        }
        for w in rows
    ]


def _get_crm_form(name: str):
    try:
        doc = frappe.get_doc("Web Form", name)
    except frappe.DoesNotExistError as exc:
        raise ValueError("Not a CRM form") from exc
    if doc.module != FORM_MODULE or doc.doc_type not in ALLOWED_DOCTYPE_LABELS:
        raise ValueError("Not a CRM form")
    return doc


def _load_hidden_fields(doc) -> list[dict]:
    try:
        return json.loads(doc.crm_hidden_defaults or "[]")
    except Exception:
        return []


def get_form_config(name: str) -> dict:
    doc = _get_crm_form(name)
    return {
        "name": doc.name, "title": doc.title, "route": doc.route, "document_type": doc.doc_type,
        "published": bool(doc.crm_published), "submit_button_label": doc.button_label or "Submit",
        "description": doc.introduction_text or "", "success_message": doc.success_message or "",
        "redirect_url": doc.success_url or "", "allowed_embedding_domains": doc.allowed_embedding_domains or "",
        "fields": [
            {
                "fieldname": f.fieldname, "label": f.label, "fieldtype": f.fieldtype, "options": f.options,
                "reqd": f.reqd, "placeholder": f.placeholder, "field_description": f.description,
                "depends_on": f.depends_on, "mandatory_depends_on": f.mandatory_depends_on,
                "read_only_depends_on": f.read_only_depends_on,
            }
            for f in doc.web_form_fields
        ],
        "hidden_fields": _load_hidden_fields(doc),
    }


def _assert_hidden_defaults_set(hidden: list[dict]):
    missing = [h.get("label") or h.get("fieldname") for h in hidden if not str(h.get("default") or "").strip()]
    if missing:
        raise ValidationError(f"Set a default value before publishing for: {', '.join(missing)}")


def _validated_visible_fields(document_type: str, fields: list[dict]) -> list[dict]:
    from apps.core.meta import get_doctype_meta

    meta = get_doctype_meta(document_type) or {"fields": []}
    meta_fieldnames = {f["fieldname"] for f in meta["fields"]}
    catalog = {f["fieldname"]: f for f in _mappable_fields(document_type)}
    rows = []
    for f in fields:
        fieldname = f.get("fieldname")
        if f.get("fieldtype") in LAYOUT_BREAKS:
            if fieldname in meta_fieldnames:
                raise ValueError(f"{fieldname} can't be used as a layout break")
            rows.append(f)
            continue
        allowed = catalog.get(fieldname)
        if not allowed:
            raise ValueError(f"{fieldname or 'Unnamed field'} can't be collected by a form")
        rows.append({**f, "fieldtype": allowed["fieldtype"], "options": allowed["options"]})
    return rows


def _validated_hidden_fields(document_type: str, hidden: list[dict]) -> list[dict]:
    catalog = {h["fieldname"]: h for h in _seed_hidden_fields(document_type)}
    rows = []
    for h in hidden:
        fieldname = h.get("fieldname")
        allowed = catalog.get(fieldname)
        if not allowed:
            raise ValueError(f"{fieldname or 'Unnamed field'} can't be set as a hidden field")
        rows.append({**h, "fieldtype": allowed["fieldtype"], "options": allowed["options"]})
    return rows


def save_form(name: str | None, form: dict, user) -> dict:
    if form.get("document_type") not in ALLOWED_DOCTYPE_LABELS:
        raise ValueError(f"Forms can only map to: {', '.join(ALLOWED_DOCTYPE_LABELS)}")

    doc = _get_crm_form(name) if name else frappe.new_doc("Web Form")
    if not name:
        doc.owner = user.email

    doc.title = form.get("title") or ""
    doc.route = form.get("route") or ""
    doc.doc_type = form.get("document_type")
    doc.introduction_text = form.get("description") or ""
    doc.button_label = form.get("submit_button_label") or "Submit"
    doc.success_message = form.get("success_message") or ""
    doc.success_url = form.get("redirect_url") or ""
    doc.allowed_embedding_domains = form.get("allowed_embedding_domains") or ""
    doc.crm_published = 1 if form.get("published") else 0
    doc.published = doc.crm_published
    doc.login_required = 0
    doc.allow_multiple = 1
    doc.is_standard = 0
    doc.module = FORM_MODULE

    fields = form.get("fields")
    if not name and not fields:
        fields = _seed_visible_fields(form["document_type"])

    if fields is not None:
        fields = _validated_visible_fields(form["document_type"], fields)
        doc.set("web_form_fields", [])
        for f in fields:
            doc.append(
                "web_form_fields",
                {
                    "fieldname": f.get("fieldname") or "", "label": f.get("label") or "",
                    "fieldtype": f.get("fieldtype"), "options": f.get("options") or "",
                    "reqd": 1 if f.get("reqd") else 0, "placeholder": f.get("placeholder") or "",
                    "description": f.get("field_description") or "", "depends_on": f.get("depends_on") or "",
                    "mandatory_depends_on": f.get("mandatory_depends_on") or "",
                    "read_only_depends_on": f.get("read_only_depends_on") or "",
                },
            )

    hidden = form.get("hidden_fields")
    if hidden is None and not name:
        hidden = _seed_hidden_fields(form["document_type"])
    hidden = _validated_hidden_fields(form["document_type"], hidden or [])
    if doc.crm_published:
        _assert_hidden_defaults_set(hidden)
    doc.crm_hidden_defaults = json.dumps(hidden) if hidden else ""
    _persist(doc)

    return {"name": doc.name, "route": doc.route}


def _persist(doc):
    doc.flags.ignore_permissions = True
    doc.flags.ignore_links = True
    doc.flags.ignore_validate = True
    doc.flags.ignore_mandatory = True
    doc.save()


def set_published(name: str, published: bool):
    doc = _get_crm_form(name)
    if published:
        _assert_hidden_defaults_set(_load_hidden_fields(doc))
    doc.crm_published = 1 if published else 0
    doc.published = doc.crm_published
    _persist(doc)


def delete_form(name: str):
    _get_crm_form(name)
    frappe.delete_doc("Web Form", name, ignore_permissions=True, force=True)


def test_submit_form(name: str, values: dict) -> dict:
    doc = _get_crm_form(name)
    for f in doc.web_form_fields:
        if f.fieldtype in ("Section Break", "Column Break"):
            continue
        value = values.get(f.fieldname)
        if f.reqd and (value is None or value == ""):
            raise ValueError(f"{f.label or f.fieldname} is required")
    return {"test": True}


# -- public submission (mirrors frappe.website.doctype.web_form.web_form.accept +
# crm/api/form.py's enrich_form_submission, called from apps/core/doctype/web_form/public_views.py) --

def apply_hidden_defaults(doc, web_form_name: str):
    form = frappe.db.get_value("Web Form", web_form_name, ["doc_type", "crm_hidden_defaults"], as_dict=True)
    if not form or form.doc_type not in ALLOWED_DOCTYPE_LABELS or form.doc_type != doc.doctype_label:
        return
    raw = form.crm_hidden_defaults
    if not raw:
        return
    try:
        hidden = json.loads(raw)
    except Exception:
        return
    for h in hidden:
        fieldname, default = h.get("fieldname"), h.get("default")
        if fieldname and default not in (None, "") and hasattr(doc, fieldname) and not getattr(doc, fieldname, None):
            setattr(doc, fieldname, default)


def _doc_dict(doc) -> dict:
    """create_organization/create_contact (apps/crm/doctype/deal/deal.py) take a plain
    {field: value} dict, matching how they're called from CRMDeal's own create_deal() -- doc
    here is the live model instance being submitted, so build the same shape from it."""
    return {f.name: getattr(doc, f.attname, None) for f in doc._meta.fields}


def enrich_form_submission(doc, web_form_name: str):
    if doc.doctype_label not in ALLOWED_DOCTYPE_LABELS:
        return
    apply_hidden_defaults(doc, web_form_name)
    if hasattr(doc, "source_id") and not doc.source_id:
        doc.source_id = ensure_form_source()

    if doc.doctype_label != "CRM Deal":
        return

    data = _doc_dict(doc)
    if data.get("organization_name") and not doc.organization_id:
        from apps.crm.doctype.deal.deal import create_organization

        created = create_organization(data)
        if created:
            doc.organization_id = created.pk

    has_contact_fields = any(data.get(f) for f in ("first_name", "last_name", "email", "mobile_no"))
    if has_contact_fields:
        from apps.crm.doctype.deal.deal import create_contact

        contact = create_contact(data)
        if contact:
            doc._pending_primary_contact = contact.pk
