import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import APIException, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.erpnext import doc_api
from apps.frappe import exceptions as frappe_exceptions
from apps.frappe import session
from functools import wraps

from werkzeug.datastructures import Headers

from werkzeug.datastructures import Headers

import frappe
class FrappeAPIException(APIException):
    status_code = 417
    default_detail = "Server Error"
    default_code = "frappe_error"

    def __init__(self, exc):
        self.status_code = getattr(exc, "http_status_code", 417)
        message = str(exc)
        detail = {
            "exc_type": exc.__class__.__name__,
            "exception": f"{exc.__class__.__module__}.{exc.__class__.__name__}: {message}",
            "_server_messages": json.dumps([json.dumps({"message": message, "title": "Message"})]),
        }
        super().__init__(detail)


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except (KeyError, LookupError) as exc:
        raise NotFound(str(exc)) from exc
    except Exception as exc:
        if hasattr(exc, "http_status_code") or isinstance(exc, frappe_exceptions.ValidationError):
            raise FrappeAPIException(exc) from exc
        raise


def frappe_user(user):
    if getattr(user, "is_superuser", False):
        return "Administrator"
    return getattr(user, "name", None) or user.email


def with_frappe_session(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = getattr(request, "user", None)
        is_authenticated = getattr(user, "is_authenticated", False)
        
        previous_user = getattr(session, "user", None)
        previous_request = frappe.local.request
        if user and is_authenticated:
            session.user = frappe_user(user)
        else:
            session.user = "Guest"
        for name, resolve in (("host", request.get_host), ("url", request.build_absolute_uri)):
            if not hasattr(request, name):
                try:
                    setattr(request, name, resolve())
                except Exception:
                    setattr(request, name, "")
        frappe.local.request = request
        frappe.local.user_perms = None
        frappe.local.response_headers = Headers()
        try:
            return view_func(request, *args, **kwargs)
        finally:
            session.user = previous_user
            frappe.local.request = previous_request
            frappe.local.user_perms = None
    return wrapper


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def doctype_meta(request, doctype):
    return Response(_guard(doc_api.meta, doctype, frappe_user(request.user)))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def list_docs(request, doctype):
    return Response(_guard(doc_api.list_documents, doctype, request.query_params.get("limit", 20), frappe_user(request.user)))


@api_view(["GET", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def doc_detail(request, doctype, name):
    if request.method == "GET":
        return Response(_guard(doc_api.get_document, doctype, name, frappe_user(request.user)))
    return Response(_guard(doc_api.save_document, doctype, name, request.data, frappe_user(request.user)))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def doc_create(request):
    return Response(_guard(doc_api.create_document, request.data, frappe_user(request.user)))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def doc_submit(request, doctype, name):
    return Response(_guard(doc_api.submit_document, doctype, name, frappe_user(request.user)))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def doc_cancel(request, doctype, name):
    return Response(_guard(doc_api.cancel_document, doctype, name, frappe_user(request.user)))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def doctypes(request):
    return Response(_guard(doc_api.known_doctypes))
