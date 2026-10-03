# Ported from crm/api/activities.py (frappe/crm, AGPL-3.0).
#
# The original builds this from Frappe's generic per-document machinery:
# get_docinfo() (auto-collects Comments, Communications, and "Version" rows
# -- Frappe's automatic field-change audit log written on every doc.save())
# plus linked Call Log/Note/Task records. We have no generic Version/audit
# log (no Django model tracks field-level diffs on save for any doctype), and
# no Communication/email-thread model, so those two activity types
# (field-change entries, email entries) are not producible here -- there is
# nothing to port them FROM. Everything else -- creation, status changes
# (CRMStatusChangeLog already captures these exactly), comments, calls,
# notes, tasks, attachments -- is real, live data.
from __future__ import annotations

from django.core.exceptions import PermissionDenied, ValidationError


def get_activities(name: str) -> tuple[list, list, list, list, list]:
    from apps.crm.doctype.deal.deal import CRMDeal
    from apps.crm.doctype.lead.lead import CRMLead

    if CRMDeal.objects.filter(pk=name).exists():
        return _get_deal_activities(name)
    if CRMLead.objects.filter(pk=name).exists():
        return _get_lead_activities(name)
    raise ValidationError(f"Document not found: {name}")


def _status_change_activities(doctype: str, name: str) -> list:
    from apps.crm.doctype.status_change_log.status_change_log import CRMStatusChangeLog

    qs = CRMStatusChangeLog.objects.filter(
        **{"parent_lead_id": name} if doctype == "CRM Lead" else {"parent_deal_id": name}
    ).exclude(to_status="").select_related("log_owner")

    activities = []
    for log in qs:
        if not log.to_status:
            continue
        activities.append({
            "activity_type": "changed",
            "creation": log.to_date,
            "owner": log.log_owner_id,
            "data": {
                "field": "status",
                "field_label": "Status",
                "old_value": log.from_status,
                "value": log.to_status,
            },
            "is_lead": doctype == "CRM Lead",
        })
    return activities


def _comment_activities(doctype: str, name: str) -> list:
    from apps.core.models import Comment

    return [
        {
            "name": str(c.pk),
            "activity_type": "comment",
            "creation": c.creation,
            "owner": c.owner_id,
            "content": c.content,
            "attachments": _attachments("Comment", str(c.pk)),
            "is_lead": doctype == "CRM Lead",
        }
        for c in Comment.objects.filter(reference_doctype=doctype, reference_name=name).order_by("creation")
    ]


def _attachments(doctype: str, name: str) -> list:
    from apps.core.models import FileAttachment

    return [
        {
            "name": str(f.pk),
            "file_name": f.file_name,
            "file_url": f.file_url,
            "file_size": f.file.size if f.file else 0,
            "is_private": f.is_private,
            "creation": f.creation,
            "owner": f.owner_id,
        }
        for f in FileAttachment.objects.filter(attached_to_doctype=doctype, attached_to_name=name)
    ]


def _linked_calls(doctype: str, name: str) -> dict:
    from apps.crm.doctype.call_log.call_log import CRMCallLog

    calls = CRMCallLog.objects.filter(reference_doctype=doctype, reference_docname=name)
    parsed = []
    for c in calls:
        parsed.append({
            "name": c.pk,
            "caller": c.caller_id,
            "receiver": c.receiver_id,
            "from": c.from_number,
            "to": c.to_number,
            "duration": c.duration.total_seconds() if c.duration else 0,
            "start_time": c.start_time,
            "end_time": c.end_time,
            "status": c.status,
            "type": c.type,
            "recording_url": c.recording_url,
            "creation": c.creation,
            "note": c.note_id,
            "activity_type": "incoming_call" if c.type == "Incoming" else "outgoing_call",
            "show_recording": False,
        })
    return {"calls": parsed, "notes": [], "tasks": []}


def _linked_notes(doctype: str, name: str) -> list:
    from apps.crm.doctype.note.note import FCRMNote

    return list(
        FCRMNote.objects.filter(reference_doctype=doctype, reference_docname=name)
        .values("name", "title", "content", "owner", "modified", "creation")
    )


def _linked_tasks(doctype: str, name: str) -> list:
    from apps.crm.doctype.task.task import CRMTask

    # CRMTask has no explicit "name" field (unlike FCRMNote/CRMLead/CRMDeal)
    # -- its pk is the default Django "id". The frontend (unmodified) reads
    # task.name as the record identifier, matching Frappe's generic doc
    # naming convention, so alias id -> name in the response.
    return [
        {
            "name": t["id"], "title": t["title"], "description": t["description"],
            "assigned_to": t["assigned_to"], "due_date": t["due_date"], "priority": t["priority"],
            "status": t["status"], "modified": t["modified"], "creation": t["creation"],
        }
        for t in CRMTask.objects.filter(reference_doctype=doctype, reference_docname=name)
        .values("id", "title", "description", "assigned_to", "due_date", "priority", "status", "modified", "creation")
    ]


def _get_lead_activities(name: str) -> tuple[list, list, list, list, list]:
    from apps.crm.doctype.lead.lead import CRMLead

    lead = CRMLead.objects.filter(pk=name).values("creation", "owner").first()
    if lead is None:
        raise PermissionDenied("Not permitted")

    activities = [{
        "activity_type": "creation",
        "creation": lead["creation"],
        "owner": lead["owner"],
        "data": "created this lead",
        "is_lead": True,
    }]
    activities += _status_change_activities("CRM Lead", name)
    activities += _comment_activities("CRM Lead", name)
    activities.sort(key=lambda a: a["creation"], reverse=True)

    calls = _linked_calls("CRM Lead", name)
    notes = _linked_notes("CRM Lead", name)
    tasks = _linked_tasks("CRM Lead", name)
    attachments = _attachments("CRM Lead", name)

    return activities, calls["calls"], notes, tasks, attachments


def _get_deal_activities(name: str) -> tuple[list, list, list, list, list]:
    from apps.crm.doctype.deal.deal import CRMDeal

    deal = CRMDeal.objects.filter(pk=name).values("creation", "owner", "lead_id").first()
    if deal is None:
        raise PermissionDenied("Not permitted")

    lead_id = deal["lead_id"]
    activities, notes, tasks, attachments = [], [], [], []
    calls = []
    creation_text = "created this deal"

    if lead_id:
        creation_text = "converted the lead to this deal"
        try:
            activities, calls, notes, tasks, attachments = list(_get_lead_activities(lead_id))
        except (PermissionDenied, ValidationError):
            pass

    activities.append({
        "activity_type": "creation",
        "creation": deal["creation"],
        "owner": deal["owner"],
        "data": creation_text,
        "is_lead": False,
    })
    activities += _status_change_activities("CRM Deal", name)
    activities += _comment_activities("CRM Deal", name)
    activities.sort(key=lambda a: a["creation"], reverse=True)

    deal_calls = _linked_calls("CRM Deal", name)
    calls = calls + deal_calls["calls"]
    notes = notes + _linked_notes("CRM Deal", name)
    tasks = tasks + _linked_tasks("CRM Deal", name)
    attachments = attachments + _attachments("CRM Deal", name)

    return activities, calls, notes, tasks, attachments
