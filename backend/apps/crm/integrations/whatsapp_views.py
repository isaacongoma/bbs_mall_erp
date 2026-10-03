# Ported from crm/api/whatsapp.py (frappe/crm, AGPL-3.0)
#
# The original's WhatsApp Message/Settings/Templates/Account doctypes are NOT
# part of frappe/crm itself -- they belong to a separate Frappe app
# (frappe_whatsapp) that crm only integrates with *if installed*, gracefully
# returning False/[] otherwise (see is_whatsapp_installed/is_whatsapp_enabled
# in the original). No such app exists in this Django port, so this ports the
# real crm-side logic (access control, the message-list assembly shape) and
# preserves that same "not installed" fallback rather than fabricating a
# WhatsApp Message model that was never frappe/crm's to define.
from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

ALLOWED_WHATSAPP_ROLES = {"System Manager", "Sales Manager", "Sales User"}


def _user_roles(user) -> set[str]:
    roles = {"Sales User"} if user.is_authenticated else set()
    if user.is_staff or user.is_superuser:
        roles.add("System Manager")
    return roles


def validate_access(user, reference_doctype: str | None = None, reference_name: str | None = None):
    if not (_user_roles(user) & ALLOWED_WHATSAPP_ROLES):
        raise PermissionDenied("Only sales users can access WhatsApp features.")

    if reference_doctype and reference_name:
        from apps.crm.doctype_registry import get_doctype_model

        model = get_doctype_model(reference_doctype)
        if model is None or not model.objects.filter(pk=reference_name).exists():
            raise NotFound(f"Reference document {reference_doctype} {reference_name} does not exist.")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_whatsapp_enabled(request):
    # No WhatsApp-provider app is integrated in this port -- see module docstring.
    return Response(False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_whatsapp_installed(request):
    return Response(False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_whatsapp_messages(request):
    reference_doctype = request.query_params.get("reference_doctype")
    reference_name = request.query_params.get("reference_name")
    validate_access(request.user, reference_doctype, reference_name)
    # Mirrors the original's own early-out when no WhatsApp Message doctype exists.
    return Response([])
