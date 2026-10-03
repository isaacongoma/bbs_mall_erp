# Ported from crm/integrations/twilio/api.py (frappe/crm, AGPL-3.0)
from __future__ import annotations

import logging

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.crm.telephony_utils import get_contact_lead_or_deal_from_number

from .twilio_handler import IncomingCall, Twilio, TwilioCallDetails

logger = logging.getLogger(__name__)


def _validate_twilio_request(data, require_application_sid: bool = False):
    twilio = Twilio.connect()
    if not twilio:
        raise PermissionDenied("Twilio configuration is missing")

    account_sid = str(data.get("AccountSid") or "")
    if not account_sid or account_sid != str(twilio.account_sid):
        raise PermissionDenied("Invalid Twilio account")

    if require_application_sid:
        application_sid = str(data.get("ApplicationSid") or "")
        if not application_sid or application_sid != str(twilio.application_sid):
            raise PermissionDenied("Invalid Twilio application")

    return twilio


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_enabled(request):
    from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings

    return Response(CRMTwilioSettings.get_solo().enabled)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_access_token(request):
    from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent

    twilio = Twilio.connect()
    if not twilio:
        return Response({})

    agent = CRMTelephonyAgent.objects.filter(user=request.user).first()
    if not agent or not agent.twilio_number:
        return Response({
            "ok": False, "error": "caller_phone_identity_missing",
            "detail": "Phone number is not mapped to the caller",
        })

    token = twilio.generate_voice_access_token(identity=str(request.user.pk))
    return Response({"token": token})


def _get_caller_number(caller: str) -> str | None:
    from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent

    identity = (caller or "").replace("client:", "").strip()
    user_id = Twilio.emailid_from_identity(identity)
    agent = CRMTelephonyAgent.objects.filter(user_id=user_id).first()
    return agent.twilio_number if agent else None


@api_view(["POST"])
@permission_classes([AllowAny])
def voice(request):
    """Webhook: Twilio asks for instructions when an outgoing browser call is placed."""
    data = request.data
    twilio = _validate_twilio_request(data, require_application_sid=True)

    from_number = _get_caller_number(data.get("Caller"))
    if not from_number:
        from twilio.twiml.voice_response import VoiceResponse

        resp = VoiceResponse()
        resp.say("Your account is not configured with a phone number. Please contact your administrator.")
        return HttpResponse(str(resp), content_type="text/xml")

    call_details = TwilioCallDetails(data, call_from=from_number)
    try:
        create_call_log(call_details)
    except Exception:
        logger.exception("Error while creating Twilio call log")
        return HttpResponse(str(_call_failed_response()), content_type="text/xml")

    resp = twilio.generate_twilio_dial_response(from_number, data.get("To"))
    return HttpResponse(str(resp), content_type="text/xml")


@api_view(["POST"])
@permission_classes([AllowAny])
def twilio_incoming_call_handler(request):
    """Webhook: an inbound call reaches the Twilio number."""
    data = request.data
    _validate_twilio_request(data)

    call_details = TwilioCallDetails(data)
    try:
        create_call_log(call_details)
    except Exception:
        logger.exception("Error while creating Twilio call log")
        return HttpResponse(str(_call_failed_response()), content_type="text/xml")

    resp = IncomingCall(data.get("From"), data.get("To")).process()
    return HttpResponse(str(resp), content_type="text/xml")


def _call_failed_response():
    from twilio.twiml.voice_response import VoiceResponse

    resp = VoiceResponse()
    resp.say("We're unable to connect your call right now. Please try again later.")
    return resp


def create_call_log(call_details: TwilioCallDetails):
    from apps.crm.doctype.call_log.call_log import CRMCallLog

    details = call_details.to_dict()
    receiver_id = details.pop("receiver", "") or None
    caller_id = details.pop("caller", "") or None

    call_log = CRMCallLog(**details, telephony_medium="Twilio", receiver_id=receiver_id, caller_id=caller_id)
    call_log.save()

    contact_number = details.get("from_number") if details.get("type") == "Incoming" else details.get("to_number")
    _link(contact_number, call_log)
    return call_log


def _link(contact_number, call_log):
    docname, doctype = get_contact_lead_or_deal_from_number(contact_number)
    if docname:
        call_log.link_with_reference_doc(doctype, docname)


def update_call_log(call_sid, status=None):
    from apps.crm.doctype.call_log.call_log import CRMCallLog

    twilio = Twilio.connect()
    call_log = CRMCallLog.objects.filter(pk=call_sid).first()
    if not (twilio and call_log):
        return None

    try:
        call_details = twilio.get_call_info(call_sid)
        call_log.status = TwilioCallDetails.get_call_status(status or call_details.status)
        call_log.duration = call_details.duration
        call_log.start_time = call_details.start_time
        call_log.end_time = call_details.end_time
        call_log.save()
        return call_log
    except Exception:
        logger.exception("Error while updating call record")
        return None


@api_view(["POST"])
@permission_classes([AllowAny])
def update_recording_info(request):
    data = request.data
    _validate_twilio_request(data)

    recording_url = data.get("RecordingUrl")
    call_sid = data.get("CallSid")
    call_log = update_call_log(call_sid)
    if not call_log:
        raise ValidationError("Call log not found")

    call_log.recording_url = recording_url
    call_log.save()
    return Response({})


@api_view(["POST"])
@permission_classes([AllowAny])
def update_call_status_info(request):
    import json

    data = request.data
    twilio = _validate_twilio_request(data)

    parent_call_sid = data.get("ParentCallSid")
    call_log = update_call_log(parent_call_sid, status=data.get("CallStatus"))
    if not call_log:
        raise ValidationError("Call log not found")

    call_info = {
        "ParentCallSid": data.get("ParentCallSid"), "CallSid": data.get("CallSid"),
        "CallStatus": data.get("CallStatus"), "CallDuration": data.get("CallDuration"),
        "From": data.get("From"), "To": data.get("To"),
    }
    try:
        twilio.twilio_client.calls(parent_call_sid).user_defined_messages.create(content=json.dumps(call_info))
    except Exception:
        logger.exception("Failed to update Twilio call status")
    return Response({})
