# Django REST endpoint for System Settings -- a Frappe core "Single" doctype
# (one row), modeled as a singleton the same way FCRM Settings already is
# (see apps/crm/settings_views.py). Only exposes the fields
# DefaultsSettings.vue actually reads/writes.
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.doctype.system_settings.system_settings import SystemSettings


def _serialize(doc: SystemSettings) -> dict:
    return {
        "name": "System Settings",
        "currency": doc.currency_id,
        "currency_precision": doc.currency_precision,
        "float_precision": doc.float_precision,
        "number_format": doc.number_format,
        "date_format": doc.date_format,
        "time_format": doc.time_format,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_system_settings(request):
    return Response(_serialize(SystemSettings.get_solo()))


@api_view(["PATCH", "POST"])
@permission_classes([IsAuthenticated])
def update_system_settings(request):
    doc = SystemSettings.get_solo()
    fields = request.data or {}
    for field in ("currency_precision", "float_precision", "number_format", "date_format", "time_format"):
        if field in fields:
            setattr(doc, field, fields[field] or "")
    if "currency" in fields:
        doc.currency_id = fields["currency"] or None
    doc.save()
    return Response(_serialize(doc))
