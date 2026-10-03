# Ported from crm/integrations/exotel/handler.py (frappe/crm, AGPL-3.0)
from __future__ import annotations

import logging

import requests

from apps.crm.telephony_utils import get_contact_lead_or_deal_from_number

logger = logging.getLogger(__name__)

# Exotel reports call status in lowercase, hyphenated form. Map it onto the
# options of the CRM Call Log status field.
EXOTEL_CALL_STATUSES = {
    "initiated": "Initiated", "ringing": "Ringing", "in-progress": "In Progress",
    "completed": "Completed", "failed": "Failed", "busy": "Busy", "no-answer": "No Answer",
    "queued": "Queued", "canceled": "Canceled", "cancelled": "Canceled",
}
EXOTEL_EMPTY_STATUSES = ("", "null", "none", "undefined")


def get_exotel_settings():
    from apps.crm.doctype.exotel_settings.exotel_settings import CRMExotelSettings

    return CRMExotelSettings.get_solo()


def is_integration_enabled() -> bool:
    return get_exotel_settings().enabled


def get_exotel_endpoint(action=None, version="v1"):
    settings = get_exotel_settings()
    return "https://{api_key}:{api_token}@{subdomain}/{version}/Accounts/{sid}/{action}".format(
        api_key=settings.api_key, api_token=settings.api_token, subdomain=settings.subdomain,
        version=version, sid=settings.account_sid, action=action,
    )


def get_all_exophones():
    endpoint = get_exotel_endpoint("IncomingPhoneNumbers", "v2_beta")
    response = requests.get(endpoint, timeout=15)
    return [phone.get("friendly_name") for phone in response.json().get("incoming_phone_numbers", [])]


def get_status_updater_url(user_id) -> str:
    from django.conf import settings as django_settings

    token = get_exotel_settings().webhook_verify_token
    return f"{django_settings.PUBLIC_URL}/api/crm/integrations/exotel/webhook/?key={token}&agent={user_id}"


def make_a_call(user, to_number: str, from_number: str | None = None, caller_id: str | None = None) -> dict:
    from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent

    if not is_integration_enabled():
        raise ValueError("Please setup Exotel integration")

    agent = CRMTelephonyAgent.objects.filter(user=user).first()
    if not from_number:
        from_number = agent.mobile_no if agent else None
    if not caller_id:
        caller_id = agent.exotel_number if agent else None
    if not caller_id:
        raise ValueError("You do not have Exotel Number set in your Telephony Agent")
    if caller_id not in get_all_exophones():
        raise ValueError(f"Exotel Number {caller_id} is not valid")
    if not from_number:
        raise ValueError("You do not have mobile number set in your Telephony Agent")

    record_call = get_exotel_settings().record_call
    endpoint = get_exotel_endpoint("Calls/connect.json?details=true")

    call_log_creation_failed = False
    response = requests.post(
        endpoint,
        data={
            "From": from_number, "To": to_number, "CallerId": caller_id,
            "Record": "true" if record_call else "false",
            "StatusCallback": get_status_updater_url(user.pk),
            "StatusCallbackEvents[0]": "terminal", "StatusCallbackEvents[1]": "answered",
        },
        timeout=15,
    )
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as exc:
        exception = response.json().get("RestException")
        raise ValueError(exception.get("Message") if exception else str(exc)) from exc

    res = response.json()
    call_payload = res.get("Call", {})
    try:
        create_call_log(
            call_id=call_payload.get("Sid"), from_number=call_payload.get("From"),
            to_number=call_payload.get("To"), medium=call_payload.get("PhoneNumberSid"),
            call_type="Outgoing", agent=user.pk,
        )
    except Exception:
        logger.exception("Error while creating Exotel call log")
        call_log_creation_failed = True

    call_details = res.get("Call", {})
    call_details["CallSid"] = call_details.get("Sid", "")
    call_details["call_log_creation_failed"] = call_log_creation_failed
    return call_details


def create_call_log(call_id, from_number, to_number, medium, agent, status="Ringing", call_type="Incoming"):
    from apps.crm.doctype.call_log.call_log import CRMCallLog

    call_log = CRMCallLog(
        id=call_id, to_number=to_number, medium=medium or "", type=call_type, status=status,
        telephony_medium="Exotel", from_number=from_number,
    )
    if call_type == "Incoming":
        call_log.receiver_id = agent
    else:
        call_log.caller_id = agent

    call_log.save()

    contact_number = from_number if call_type == "Incoming" else to_number
    _link(contact_number, call_log)
    return call_log


def _link(contact_number, call_log):
    docname, doctype = get_contact_lead_or_deal_from_number(contact_number)
    if docname:
        call_log.link_with_reference_doc(doctype, docname)


def get_call_log(call_payload):
    from apps.crm.doctype.call_log.call_log import CRMCallLog

    call_log_id = call_payload.get("CallSid")
    return CRMCallLog.objects.filter(pk=call_log_id).first()


def normalize_call_status(status):
    if not status:
        return None
    status = str(status).strip().lower().replace("_", "-").replace(" ", "-")
    if status in EXOTEL_EMPTY_STATUSES:
        return None
    if status not in EXOTEL_CALL_STATUSES:
        logger.warning("Unknown Exotel call status: %r", status)
        return None
    return EXOTEL_CALL_STATUSES[status]


def get_call_log_status(call_payload, direction="inbound"):
    if direction in ("outbound-api", "outbound-dial"):
        status = normalize_call_status(call_payload.get("Status"))
        if status == "Busy":
            status = "Ringing"
        if status:
            return status

    call_type = call_payload.get("CallType")
    status = normalize_call_status(call_payload.get("DialCallStatus") or call_payload.get("Status"))

    if call_type == "completed":
        status = "Completed"
    elif status == "Busy":
        status = "Ringing"

    return status


def update_call_log(call_payload, call_log=None):
    direction = call_payload.get("Direction")
    call_log = call_log or get_call_log(call_payload)
    status = get_call_log_status(call_payload, direction)
    if not call_log:
        return None
    try:
        if status:
            call_log.status = status
        call_log.to_number = call_payload.get("DialWhomNumber") or call_payload.get("To")
        call_log.duration = call_payload.get("DialCallDuration") or call_payload.get("ConversationDuration") or 0
        call_log.recording_url = call_payload.get("RecordingUrl") or ""
        call_log.start_time = call_payload.get("StartTime") or None
        call_log.end_time = call_payload.get("EndTime") or None
        if direction == "incoming" and call_payload.get("AgentEmail"):
            call_log.receiver_id = call_payload.get("AgentEmail")
        call_log.save()
        return call_log
    except Exception:
        logger.exception("Error while updating call record")
        return None
