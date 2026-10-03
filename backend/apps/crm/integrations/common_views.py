# Ported from crm/integrations/api.py's shared (non-provider-specific) endpoints
# (frappe/crm, AGPL-3.0)
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

import requests
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


def _get_recording_credentials(telephony_medium: str):
    if telephony_medium == "Twilio":
        from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings

        s = CRMTwilioSettings.get_solo()
        return (s.api_key, s.api_secret) if s.api_key and s.api_secret else None
    if telephony_medium == "Exotel":
        from apps.crm.doctype.exotel_settings.exotel_settings import CRMExotelSettings

        s = CRMExotelSettings.get_solo()
        return (s.api_key, s.api_token) if s.api_key and s.api_token else None
    return None


def _resolve_validated_ip(hostname: str, port: int) -> str:
    try:
        addrinfos = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ValidationError("Invalid recording URL") from exc
    ips = [info[4][0] for info in addrinfos]
    if not ips:
        raise ValidationError("Invalid recording URL")
    for ip in ips:
        if not ipaddress.ip_address(ip).is_global:
            raise ValidationError("Recording URL is not allowed")
    return ips[0]


class _PinnedIPAdapter(requests.adapters.HTTPAdapter):
    def __init__(self, pinned_ip: str, hostname: str, **kwargs):
        self._pinned_ip = pinned_ip
        self._hostname = hostname
        super().__init__(**kwargs)

    def send(self, request, **kwargs):
        from urllib.parse import urlunparse

        parsed = urlparse(request.url)
        literal_ip = f"[{self._pinned_ip}]" if ipaddress.ip_address(self._pinned_ip).version == 6 else self._pinned_ip
        netloc = f"{literal_ip}:{parsed.port}" if parsed.port else literal_ip
        request.url = urlunparse(parsed._replace(netloc=netloc))
        host = f"[{parsed.hostname}]" if ":" in (parsed.hostname or "") else parsed.hostname
        request.headers["Host"] = f"{host}:{parsed.port}" if parsed.port else host
        if parsed.scheme == "https":
            self.poolmanager.connection_pool_kw["server_hostname"] = self._hostname
            self.poolmanager.connection_pool_kw["assert_hostname"] = self._hostname
        return super().send(request, **kwargs)


def _safe_get(url: str, auth, headers: dict):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValidationError("Invalid recording URL")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    pinned_ip = _resolve_validated_ip(parsed.hostname, port)
    session = requests.Session()
    session.mount(f"{parsed.scheme}://", _PinnedIPAdapter(pinned_ip, parsed.hostname))
    resp = session.get(url, auth=auth, headers=headers, stream=True, timeout=30, allow_redirects=False)
    return resp, session


def _fetch_recording(url: str, auth, headers: dict):
    current_url, current_auth = url, auth
    for _hop in range(5):
        resp, session = _safe_get(current_url, current_auth, headers)
        if resp.is_redirect and resp.headers.get("Location"):
            current_url = requests.compat.urljoin(current_url, resp.headers["Location"])
            current_auth = None
            resp.close()
            session.close()
            continue
        resp._pinned_session = session
        return resp
    raise ValidationError("Too many redirects while fetching recording")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_recording_url(request, call_log_name: str):
    from apps.crm.doctype.call_log.call_log import CRMCallLog

    log = CRMCallLog.objects.filter(pk=call_log_name).first()
    if not log:
        raise NotFound("Call log not found")
    if not log.recording_url:
        raise NotFound("Recording URL not found")

    auth = _get_recording_credentials(log.telephony_medium)
    req_headers = {}
    range_header = request.META.get("HTTP_RANGE")
    if range_header:
        req_headers["Range"] = range_header

    upstream = _fetch_recording(log.recording_url, auth, req_headers)
    upstream.raise_for_status()

    def stream():
        try:
            yield from upstream.iter_content(chunk_size=64 * 1024)
        finally:
            upstream.close()
            session = getattr(upstream, "_pinned_session", None)
            if session is not None:
                session.close()

    response = StreamingHttpResponse(
        stream(), status=upstream.status_code, content_type=upstream.headers.get("Content-Type") or "audio/mpeg",
    )
    response["Accept-Ranges"] = "bytes"
    for header in ("Content-Length", "Content-Range"):
        if upstream.headers.get(header):
            response[header] = upstream.headers[header]
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_note_to_call_log(request):
    from apps.crm.doctype.call_log.call_log import CRMCallLog
    from apps.crm.doctype.note.note import FCRMNote

    call_sid = request.data.get("call_sid")
    note = request.data.get("note") or {}
    call_log = CRMCallLog.objects.filter(pk=call_sid).first()
    if not call_log:
        raise NotFound("Call log not found")

    if not note.get("name"):
        note_doc = FCRMNote(title=note.get("title", "Call Note"), content=note.get("content", ""))
        note_doc.save()
    else:
        note_doc = FCRMNote.objects.get(pk=note["name"])
        note_doc.content = note.get("content", note_doc.content)
        note_doc.save()

    call_log.link_with_reference_doc("FCRM Note", note_doc.pk)
    return Response({"name": note_doc.pk, "title": note_doc.title, "content": note_doc.content})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_task_to_call_log(request):
    from apps.crm.doctype.call_log.call_log import CRMCallLog
    from apps.crm.doctype.task.task import CRMTask

    call_sid = request.data.get("call_sid")
    task = request.data.get("task") or {}
    call_log = CRMCallLog.objects.filter(pk=call_sid).first()
    if not call_log:
        raise NotFound("Call log not found")

    fields = dict(
        title=task.get("title", ""), description=task.get("description", ""),
        assigned_to_id=task.get("assigned_to"), due_date=task.get("due_date"),
        status=task.get("status", ""), priority=task.get("priority", ""),
    )
    if not task.get("name"):
        task_doc = CRMTask(**fields)
    else:
        task_doc = CRMTask.objects.get(pk=task["name"])
        for key, value in fields.items():
            setattr(task_doc, key, value)
    task_doc.save()

    call_log.link_with_reference_doc("CRM Task", str(task_doc.pk))
    return Response({"name": task_doc.pk, "title": task_doc.title})


@api_view(["GET"])
@permission_classes([AllowAny])
def is_call_integration_enabled(request):
    # composables/telephony.js's callEnabled is a module-level auto-fetch,
    # reached before login completes (same reasoning as get_boot's
    # AllowAny) -- guard the per-agent lookup for that anonymous case.
    from apps.crm.doctype.exotel_settings.exotel_settings import CRMExotelSettings
    from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent
    from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings

    agent = (
        CRMTelephonyAgent.objects.filter(user=request.user).first()
        if request.user.is_authenticated
        else None
    )
    return Response({
        "integrations": {
            "twilio": CRMTwilioSettings.get_solo().enabled,
            "exotel": CRMExotelSettings.get_solo().enabled,
        },
        "default_calling_medium": agent.default_medium if agent else None,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_default_calling_medium(request):
    from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent

    medium = request.data.get("medium")
    agent, _created = CRMTelephonyAgent.objects.get_or_create(user=request.user)
    agent.default_medium = medium
    agent.save()
    return Response({"default_calling_medium": agent.default_medium})
