# Ported from crm/fcrm/doctype/crm_call_log/crm_call_log.py's module-level
# functions (frappe/crm, AGPL-3.0)
from apps.crm.doctype.call_log.call_log import CRMCallLog
from apps.crm.telephony_utils import get_contact_by_phone_number


def seconds_to_duration(seconds: float | int | None) -> str:
    """Ported from crm/utils/__init__.py (frappe/crm, AGPL-3.0)."""
    if not seconds:
        return "0s"
    seconds = int(seconds)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)
    parts = []
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if seconds or not parts:
        parts.append(f"{seconds}s")
    return " ".join(parts)


def _user_label_image(user_id) -> tuple[str | None, str | None]:
    from apps.core.models import User

    if not user_id:
        return None, None
    user = User.objects.filter(pk=user_id).values("first_name", "last_name", "user_image").first()
    if not user:
        return None, None
    full_name = " ".join(p for p in (user["first_name"], user["last_name"]) if p)
    return full_name or None, user["user_image"]


def parse_call_log(call: dict) -> dict:
    call["show_recording"] = False
    # The other side of the call is always the CRM's own User (caller/receiver
    # field), the contact-by-phone lookup only ever resolves the external
    # party -- both sides are filled in either direction, matching the
    # original (dropping one silently would leave that avatar blank).
    if call.get("type") == "Incoming":
        call["activity_type"] = "incoming_call"
        contact = get_contact_by_phone_number(call.get("from_number"))
        call["_caller"] = {"label": contact.get("full_name", "Unknown"), "image": contact.get("image")}
        label, image = _user_label_image(call.get("receiver"))
        call["_receiver"] = {"label": label, "image": image}
    elif call.get("type") == "Outgoing":
        call["activity_type"] = "outgoing_call"
        label, image = _user_label_image(call.get("caller"))
        call["_caller"] = {"label": label, "image": image}
        contact = get_contact_by_phone_number(call.get("to_number"))
        call["_receiver"] = {"label": contact.get("full_name", "Unknown"), "image": contact.get("image")}
    return call


def get_call_log(name: str) -> dict:
    from apps.crm.doctype.call_log.call_log_serializer import CRMCallLogSerializer
    from apps.crm.doctype.note.note import FCRMNote
    from apps.crm.doctype.task.task import CRMTask

    call = CRMCallLog.objects.get(pk=name)
    data = CRMCallLogSerializer(call).data
    data = parse_call_log(data)
    data["_duration"] = seconds_to_duration(call.duration.total_seconds() if call.duration else 0)

    note_names = [call.note_id] if call.note_id else []
    task_names = []
    references = {}

    if call.reference_doctype in ("CRM Lead", "CRM Deal") and call.reference_docname:
        references[call.reference_doctype] = call.reference_docname

    for link in call.links.all():
        if link.link_doctype == "CRM Task":
            task_names.append(link.link_name)
        elif link.link_doctype == "FCRM Note":
            note_names.append(link.link_name)
        elif link.link_doctype in ("CRM Lead", "CRM Deal"):
            references[link.link_doctype] = link.link_name

    data["_notes"] = list(FCRMNote.objects.filter(pk__in=note_names).values())
    # CRMTask has no explicit "name" field (default Django "id" pk) -- the
    # frontend reads task.name as the record identifier (Frappe convention).
    data["_tasks"] = [
        {**t, "name": t["id"]}
        for t in CRMTask.objects.filter(pk__in=task_names).values()
    ]

    if references.get("CRM Lead"):
        data["_lead"] = references["CRM Lead"]
    if references.get("CRM Deal"):
        data["_deal"] = references["CRM Deal"]

    return data


def create_lead_from_call_log(call_log_name: str, lead_details: dict | None = None) -> str:
    from apps.crm.doctype.lead.lead import CRMLead

    call_doc = CRMCallLog.objects.get(pk=call_log_name)

    from apps.core.middleware import get_current_user

    lead_details = lead_details or {}
    valid_fieldnames = {f.name for f in CRMLead._meta.fields}
    sanitized = {k: v for k, v in lead_details.items() if k in valid_fieldnames}

    if "lead_owner" in valid_fieldnames and not sanitized.get("lead_owner"):
        user = get_current_user()
        if user and getattr(user, "is_authenticated", False):
            sanitized["lead_owner_id"] = user.pk

    if "mobile_no" in valid_fieldnames and not sanitized.get("mobile_no"):
        sanitized["mobile_no"] = call_doc.from_number or ""

    if "first_name" in valid_fieldnames and not sanitized.get("first_name"):
        reference_label = sanitized.get("mobile_no") or call_doc.pk
        sanitized["first_name"] = f"Lead from call {reference_label}"

    lead = CRMLead(**sanitized)
    lead.save()

    call_doc.link_with_reference_doc("CRM Lead", lead.name)

    return lead.name
