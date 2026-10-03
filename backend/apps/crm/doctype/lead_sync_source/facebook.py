import json
import traceback as traceback_module

import requests
from django.db import transaction
from django.utils import timezone

from apps.crm.doctype.lead.lead import CRMLead
from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus
from apps.crm.doctype.lead_sync_source.lead_sync_source import (
    FacebookLeadForm,
    FacebookLeadFormQuestion,
    FacebookPage,
    FailedLeadSyncLog,
    LeadSyncSource,
)

GRAPH = "https://graph.facebook.com/v19.0"
TIMEOUT = 20


class FacebookError(Exception):
    pass


def _get(path: str, token: str, **params) -> dict:
    response = requests.get(f"{GRAPH}/{path}", params={"access_token": token, **params}, timeout=TIMEOUT)
    data = response.json() if response.content else {}
    if response.status_code >= 400 or "error" in data:
        raise FacebookError((data.get("error") or {}).get("message") or f"Facebook request failed ({response.status_code})")
    return data


def _paged(path: str, token: str, **params) -> list:
    rows: list = []
    data = _get(path, token, **params)
    rows.extend(data.get("data", []))
    while data.get("paging", {}).get("next"):
        response = requests.get(data["paging"]["next"], timeout=TIMEOUT)
        data = response.json()
        rows.extend(data.get("data", []))
    return rows


def refresh_pages(source: LeadSyncSource) -> None:
    pages = _paged("me/accounts", source.access_token, fields="id,name,access_token")
    for page in pages:
        FacebookPage.objects.update_or_create(
            name=page["id"], defaults={"page_name": page.get("name", ""), "access_token": page.get("access_token", "")}
        )
        refresh_forms(FacebookPage.objects.get(pk=page["id"]))


def refresh_forms(page: FacebookPage) -> None:
    forms = _paged(f"{page.name}/leadgen_forms", page.access_token, fields="id,name,questions")
    for form in forms:
        record, _ = FacebookLeadForm.objects.update_or_create(
            name=form["id"], defaults={"lead_form_name": form.get("name", ""), "page": page}
        )
        existing = {question.key: question for question in record.questions.all()}
        for index, question in enumerate(form.get("questions", [])):
            key = question.get("key") or question.get("id") or ""
            if not key:
                continue
            if key in existing:
                continue
            FacebookLeadFormQuestion.objects.create(
                parent=record, idx=index, key=key, label=question.get("label", ""), type=question.get("type", "")
            )


def _lead_values(form: FacebookLeadForm, lead: dict) -> dict:
    mapping = {q.key: q.mapped_to_crm_field for q in form.questions.all() if q.mapped_to_crm_field}
    values: dict = {}
    for item in lead.get("field_data", []):
        target = mapping.get(item.get("name"))
        if target and item.get("values"):
            values[target] = item["values"][0]
    return values


def create_lead(values: dict) -> CRMLead:
    allowed = {field.name for field in CRMLead._meta.get_fields() if hasattr(field, "attname")}
    data = {key: value for key, value in values.items() if key in allowed and key not in ("name", "status")}
    data.setdefault("first_name", data.get("lead_name") or "Unknown")
    status = CRMLeadStatus.objects.order_by("position").first() if hasattr(CRMLeadStatus, "position") else CRMLeadStatus.objects.first()
    lead = CRMLead(**data)
    if status is not None:
        lead.status = status
    lead.save()
    return lead


def sync_source(source: LeadSyncSource) -> int:
    form = source.facebook_lead_form
    page = source.facebook_page
    if not form or not page:
        raise FacebookError("Select a Facebook page and lead form before syncing")
    leads = _paged(f"{form.name}/leads", page.access_token, fields="id,created_time,field_data")
    created = 0
    for lead in leads:
        if source.last_synced_at and lead.get("created_time") and lead["created_time"] <= source.last_synced_at.strftime("%Y-%m-%dT%H:%M:%S%z"):
            continue
        try:
            values = _lead_values(form, lead)
            if not values:
                raise FacebookError("No mapped fields in this lead")
            with transaction.atomic():
                create_lead(values)
            created += 1
        except Exception as error:
            FailedLeadSyncLog.objects.create(
                source=source,
                type="Mapping Failed" if isinstance(error, FacebookError) else "Sync Failed",
                lead_data=json.dumps(lead, indent=2),
                traceback=traceback_module.format_exc(),
            )
    source.last_synced_at = timezone.now()
    source.save(update_fields=["last_synced_at"])
    return created


def retry_log(log: FailedLeadSyncLog) -> CRMLead:
    lead = json.loads(log.lead_data or "{}")
    source = log.source
    form = source.facebook_lead_form
    if not form:
        raise FacebookError("This source has no lead form")
    values = _lead_values(form, lead)
    if not values:
        raise FacebookError("No mapped fields in this lead")
    created = create_lead(values)
    log.type = "Synced"
    log.save(update_fields=["type"])
    return created
