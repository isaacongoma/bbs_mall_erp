# Ported from crm/integrations/exotel/handler.py's whitelisted endpoints (frappe/crm, AGPL-3.0)
from __future__ import annotations

import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from . import exotel_handler as h

logger = logging.getLogger(__name__)


def _validate_request(request):
    token = h.get_exotel_settings().webhook_verify_token
    key = request.query_params.get("key")
    if not key or key != token:
        raise PermissionDenied("Unauthorized request")


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def handle_request(request):
    """Incoming-call / call-status webhook."""
    _validate_request(request)
    if not h.is_integration_enabled():
        return Response({})

    call_payload = request.data or request.query_params

    try:
        status = call_payload.get("Status")
        if status == "free":
            return Response({})

        call_log = h.get_call_log(call_payload)
        if call_log:
            h.update_call_log(call_payload, call_log=call_log)
        elif call_payload.get("Direction") == "incoming":
            h.create_call_log(
                call_id=call_payload.get("CallSid"), from_number=call_payload.get("CallFrom"),
                to_number=call_payload.get("DialWhomNumber"), medium=call_payload.get("To"),
                status=h.get_call_log_status(call_payload), agent=call_payload.get("AgentEmail"),
            )
        elif agent := request.query_params.get("agent"):
            h.create_call_log(
                call_id=call_payload.get("CallSid"),
                from_number=call_payload.get("From") or call_payload.get("CallFrom"),
                to_number=call_payload.get("DialWhomNumber") or call_payload.get("To"),
                medium=call_payload.get("To"), agent=agent, call_type="Outgoing",
                status=h.get_call_log_status(call_payload, direction=call_payload.get("Direction")),
            )
    except Exception:
        logger.exception("Error while creating/updating call record")

    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def make_a_call(request):
    to_number = request.data.get("to_number")
    from_number = request.data.get("from_number")
    caller_id = request.data.get("caller_id")
    try:
        return Response(h.make_a_call(request.user, to_number, from_number, caller_id))
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_enabled(request):
    return Response(h.is_integration_enabled())
