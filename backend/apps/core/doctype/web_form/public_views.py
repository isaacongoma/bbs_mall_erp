# Ported from crm/www/crm_form.py (page) + frappe.website.doctype.web_form.web_form.accept
# (submission), frappe/crm AGPL-3.0 / frappe/frappe MIT. Guest-facing: no auth, matching a
# public lead-capture form embedded on a third-party site.
from __future__ import annotations

import json
import re

from django.http import Http404
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

import frappe
from apps.core.doctype.web_form import web_form_api as api

MAX_LINK_OPTIONS = 500
ALLOWED_EMBEDDING_DOMAIN_RE = re.compile(
    r"^(https?://)?(\*\.)?[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?(?::\d+)?$"
)


def crm_form_page(request, route: str):
    """GET /crm-form/<route>/ -- renders the public lead/deal capture page."""
    route = route.strip("/")
    labels = ("in", api.ALLOWED_DOCTYPE_LABELS)
    name = frappe.db.get_value("Web Form", {"route": route, "crm_published": 1, "doc_type": labels})
    is_author = request.user.is_authenticated and api.is_manager(request.user)
    if not name and is_author:
        name = frappe.db.get_value("Web Form", {"route": route, "doc_type": labels})
    if not name:
        raise Http404
    doc = frappe.get_doc("Web Form", name)

    fields = [
        {
            "fieldname": f.fieldname,
            "label": f.label or ("" if f.fieldtype in ("Section Break", "Column Break") else f.fieldname),
            "fieldtype": f.fieldtype,
            "options": f.options or "",
            # Django templates can't call str.split(arg) inline (unlike the Jinja original) --
            # pre-split here so the template only ever does plain attribute/loop access.
            "options_list": [o for o in (f.options or "").split("\n") if o] if f.fieldtype == "Select" else [],
            "is_email": (f.options or "") == "Email",
            "is_phone": f.fieldtype == "Phone" or (f.options or "") == "Phone",
            "reqd": int(f.reqd or 0),
            "placeholder": f.placeholder or "",
            "description": f.description or "",
            "depends_on": f.depends_on or "",
            "mandatory_depends_on": f.mandatory_depends_on or "",
            "read_only_depends_on": f.read_only_depends_on or "",
        }
        for f in doc.web_form_fields
    ]
    for f in fields:
        f["link_options"] = _link_field_options(f["options"]) if f["fieldtype"] == "Link" else []
    context = {
        "embed": request.GET.get("embed") in ("1", "true", "yes"),
        "draft_preview": not doc.crm_published,
        "form_title": doc.title,
        "form_description": doc.introduction_text or "",
        "form_route": doc.route,
        "web_form_name": doc.name,
        "submit_label": doc.button_label or "Submit",
        "success_message": doc.success_message or "Thank you!",
        "success_url": doc.success_url or "",
        "fields": fields,
        "layout": _build_layout(fields),
        "fields_json": json.dumps(fields),
        "form_route_json": json.dumps(doc.route),
        "web_form_name_json": json.dumps(doc.name),
        "success_url_json": json.dumps(doc.success_url or ""),
        "draft_preview_json": json.dumps(not doc.crm_published),
        "embed_json": json.dumps(request.GET.get("embed") in ("1", "true", "yes")),
    }
    response = render(request, "web_form/crm_form.html", context)
    _set_embedding_headers(response, doc)
    return response


def _link_field_options(doctype: str) -> list[dict]:
    from apps.crm.doctype_registry import get_doctype_model

    if not doctype or not api.guest_can_select(doctype):
        return []
    model = get_doctype_model(doctype)
    if model is None:
        return []
    title_field = "name"
    rows = model.objects.all().order_by(title_field)[:MAX_LINK_OPTIONS]
    return [{"value": str(r.pk), "label": str(r)} for r in rows]


def _set_embedding_headers(response, doc):
    domains = [d for d in (doc.allowed_embedding_domains or "").split() if ALLOWED_EMBEDDING_DOMAIN_RE.match(d)]
    if domains:
        response["Content-Security-Policy"] = "frame-ancestors 'self' " + " ".join(domains)


def _build_layout(fields: list[dict]) -> list[dict]:
    sections = []
    current = {"label": None, "columns": [[]]}
    for f in fields:
        ft = f["fieldtype"]
        if ft == "Section Break":
            sections.append(current)
            current = {"label": f.get("label") or None, "columns": [[]]}
        elif ft == "Column Break":
            current["columns"].append([])
        else:
            current["columns"][-1].append(f)
    sections.append(current)
    return [s for s in sections if s["label"] or any(col for col in s["columns"])]


@api_view(["POST"])
@permission_classes([AllowAny])
def submit_form(request):
    """POST /api/crm/web-form/submit/ -- mirrors frappe.website.doctype.web_form.web_form.accept
    for this port's CRM-only forms: validates, inserts the target Lead/Deal, and re-applies
    CRM's own enrichment (crm.api.form.enrich_form_submission)."""
    from apps.crm.doctype_registry import get_doctype_model

    web_form_name = request.data.get("web_form")
    raw_values = request.data.get("data")
    if isinstance(raw_values, str):
        try:
            values = json.loads(raw_values)
        except ValueError as exc:
            raise ValidationError("Invalid submission payload") from exc
    else:
        values = raw_values or {}

    found = frappe.db.exists(
        "Web Form", {"name": web_form_name, "crm_published": 1, "doc_type": ("in", api.ALLOWED_DOCTYPE_LABELS)}
    )
    if not found:
        raise ValidationError("Form not found or not published")
    doc_row = frappe.get_doc("Web Form", web_form_name)

    model = get_doctype_model(doc_row.doc_type)
    allowed_fields = {f.fieldname for f in doc_row.web_form_fields if f.fieldtype not in ("Section Break", "Column Break")}
    missing = []
    for f in doc_row.web_form_fields:
        if f.fieldtype in ("Section Break", "Column Break"):
            continue
        value = values.get(f.fieldname)
        if f.reqd and (value is None or value == ""):
            missing.append(f.label or f.fieldname)
    if missing:
        raise ValidationError(f"Required: {', '.join(missing)}")

    instance = model()
    for fieldname, value in values.items():
        if fieldname in allowed_fields and value not in (None, ""):
            setattr(instance, fieldname, value)
    if not getattr(instance, "doctype_label", None):
        instance.doctype_label = doc_row.doc_type

    api.enrich_form_submission(instance, web_form_name)
    instance.save()

    pending_contact = getattr(instance, "_pending_primary_contact", None)
    if pending_contact and hasattr(instance, "contacts"):
        instance.contacts.create(contact_id=pending_contact, is_primary=True)

    return Response({"name": instance.pk})
