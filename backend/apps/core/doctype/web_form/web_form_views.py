# DRF wrappers around web_form_api.py's functions -- the REST surface the Vue Forms builder
# calls via call('crm.api.form.*', ...).
from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.doctype.web_form import web_form_api as api


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except DjangoValidationError as exc:
        raise ValidationError(exc.messages if hasattr(exc, "messages") else str(exc)) from exc
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


def _require_manager(user):
    if not api.is_manager(user):
        raise PermissionDenied("Not permitted")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_form_fields(request):
    return Response(_guard(api.get_form_fields, request.query_params.get("document_type")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_hidden_seed(request):
    return Response(_guard(api.get_hidden_seed, request.query_params.get("document_type")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def link_field_guest_access(request):
    _require_manager(request.user)
    return Response(_guard(api.link_field_guest_access, request.data.get("doctype")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def grant_guest_link_access(request):
    _require_manager(request.user)
    return Response(_guard(api.grant_guest_link_access, request.data.get("doctype")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_forms(request):
    _require_manager(request.user)
    return Response(_guard(api.list_forms))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_form_config(request):
    _require_manager(request.user)
    return Response(_guard(api.get_form_config, request.query_params.get("name")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_form(request):
    _require_manager(request.user)
    p = request.data
    form = p.get("form")
    import json

    if isinstance(form, str):
        form = json.loads(form or "{}")
    return Response(_guard(api.save_form, p.get("name"), form, request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_published(request):
    _require_manager(request.user)
    _guard(api.set_published, request.data.get("name"), bool(int(request.data.get("published") or 0)))
    return Response(None)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_form(request):
    _require_manager(request.user)
    _guard(api.delete_form, request.data.get("name"))
    return Response(None)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def test_submit_form(request):
    _require_manager(request.user)
    p = request.data
    values = p.get("values")
    import json

    if isinstance(values, str):
        values = json.loads(values or "{}")
    return Response(_guard(api.test_submit_form, p.get("name"), values or {}))
