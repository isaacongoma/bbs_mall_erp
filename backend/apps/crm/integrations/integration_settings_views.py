# REST surface for the telephony settings screens: the CRM Twilio Settings / CRM Exotel Settings
# singletons and the per-user CRM Telephony Agent record (frappe/crm, AGPL-3.0).
from __future__ import annotations

import logging

from django.conf import settings as django_settings
from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.crm.doctype.exotel_settings.exotel_settings import CRMExotelSettings
from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent
from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings

logger = logging.getLogger(__name__)

MASK = "*****"

TWILIO_FIELDS = (
    "enabled", "record_calls", "account_sid", "auth_token", "api_key", "api_secret", "twiml_sid", "app_name",
    "twilio_apps",
)
TWILIO_SECRETS = ("auth_token", "api_secret")
EXOTEL_FIELDS = ("enabled", "record_call", "account_sid", "subdomain", "api_key", "api_token", "webhook_verify_token")
EXOTEL_SECRETS = ("api_token",)
DEFAULT_APP_NAME = "BBS MALL ERP"


def _is_manager(user) -> bool:
    return bool(user.is_superuser or user.is_staff)


def _require_manager(request) -> None:
    if not _is_manager(request.user):
        raise PermissionDenied("Only managers can change integration settings")


def _serialize(doc, fields: tuple[str, ...], secrets: tuple[str, ...], name: str) -> dict:
    data = {field: getattr(doc, field) for field in fields}
    for field in secrets:
        if data[field]:
            data[field] = MASK
    data["name"] = name
    data["doctype"] = name
    return data


def _apply(doc, fields: tuple[str, ...], secrets: tuple[str, ...], values: dict) -> None:
    for field in fields:
        if field not in values:
            continue
        value = values[field]
        if field in secrets and isinstance(value, str) and value and set(value) == {"*"}:
            continue
        setattr(doc, field, value if value is not None else "")


def _twilio_client(doc):
    from twilio.rest import Client

    return Client(doc.account_sid, doc.auth_token)


def _sync_twilio(doc: CRMTwilioSettings) -> None:
    from twilio.base.exceptions import TwilioRestException

    try:
        client = _twilio_client(doc)
        client.api.accounts(doc.account_sid).fetch()
        if not doc.api_key or not doc.api_secret:
            key = client.new_keys.create(friendly_name=DEFAULT_APP_NAME)
            doc.api_key = key.sid
            doc.api_secret = key.secret
        voice_url = f"{django_settings.PUBLIC_URL}/api/crm/integrations/twilio/voice/"
        app_name = doc.app_name or DEFAULT_APP_NAME
        existing = next((app for app in client.applications.list() if app.friendly_name == app_name), None)
        if existing:
            existing.update(voice_url=voice_url, voice_method="POST")
            application = existing
        else:
            application = client.applications.create(
                friendly_name=app_name, voice_url=voice_url, voice_method="POST"
            )
        doc.app_name = app_name
        doc.twiml_sid = application.sid
        doc.twilio_apps = ",".join(app.friendly_name for app in client.applications.list())
    except TwilioRestException as error:
        raise ValidationError(error.msg or "Invalid Account SID or Auth Token")


@api_view(["GET", "PATCH", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def twilio_settings(request):
    doc = CRMTwilioSettings.get_solo()
    if request.method != "GET":
        _require_manager(request)
        _apply(doc, TWILIO_FIELDS, TWILIO_SECRETS, request.data or {})
        if doc.enabled and doc.account_sid and doc.auth_token:
            _sync_twilio(doc)
        doc.save()
    return Response(_serialize(doc, TWILIO_FIELDS, TWILIO_SECRETS, "CRM Twilio Settings"))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def twilio_fetch_applications(request):
    _require_manager(request)
    doc = CRMTwilioSettings.get_solo()
    if not (doc.account_sid and doc.auth_token):
        raise ValidationError("Account SID and Auth Token are required")
    from twilio.base.exceptions import TwilioRestException

    try:
        doc.twilio_apps = ",".join(app.friendly_name for app in _twilio_client(doc).applications.list())
    except TwilioRestException as error:
        raise ValidationError(error.msg or "Unable to fetch Twilio apps")
    doc.save(update_fields=["twilio_apps"])
    return Response({"twilio_apps": doc.twilio_apps})


@api_view(["GET", "PATCH", "POST", "PUT"])
@permission_classes([IsAuthenticated])
def exotel_settings(request):
    doc = CRMExotelSettings.get_solo()
    if request.method != "GET":
        _require_manager(request)
        _apply(doc, EXOTEL_FIELDS, EXOTEL_SECRETS, request.data or {})
        doc.save()
    return Response(_serialize(doc, EXOTEL_FIELDS, EXOTEL_SECRETS, "CRM Exotel Settings"))


class TelephonyAgentSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = CRMTelephonyAgent
        fields = ("name", "user", "mobile_no", "twilio_number", "exotel_number", "default_medium", "call_receiving_device")
        read_only_fields = ("name", "user")

    def get_name(self, obj):
        return obj.user.email

    def get_user(self, obj):
        return obj.user.email


class TelephonyAgentViewSet(viewsets.ModelViewSet):
    queryset = CRMTelephonyAgent.objects.select_related("user")
    serializer_class = TelephonyAgentSerializer
    lookup_value_regex = "[^/]+"

    def get_object(self):
        identifier = self.kwargs["pk"]
        if identifier not in (self.request.user.email, str(self.request.user.pk)) and not _is_manager(self.request.user):
            raise PermissionDenied("You can only manage your own telephony settings")
        queryset = self.get_queryset()
        agent = queryset.filter(user__email=identifier).first()
        if agent is None and str(identifier).isdigit():
            agent = queryset.filter(user__pk=int(identifier)).first()
        if agent is None:
            from apps.core.models import User

            owner = User.objects.filter(email=identifier).first() or (
                User.objects.filter(pk=int(identifier)).first() if str(identifier).isdigit() else None
            )
            if owner is None:
                raise ValidationError("User not found")
            agent = CRMTelephonyAgent.objects.create(user=owner)
        return agent
