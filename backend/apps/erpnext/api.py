import datetime
import decimal
import importlib
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

import frappe
from apps.erpnext.views import _guard, with_frappe_session
from apps.frappe import exceptions
from apps.frappe.model.document import Document

for _module in ("apps.frappe.client", "apps.frappe.boot"):
    importlib.import_module(_module)

METHOD_PREFIXES = {"frappe": "apps.frappe", "erpnext": "apps.erpnext", "hrms": "apps.hrms", "bbs_property": "apps.bbs_property"}
SPA_BOOT_METHODS = {"frappe.sessions.get", "frappe.desk.desktop.get_workspaces"}
RESOURCE_JSON_ARGS = {"fields", "filters", "or_filters", "group_by", "order_by"}


def jsonable(value):
    if isinstance(value, Document):
        return jsonable(value.as_dict())
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [jsonable(item) for item in value]
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, (datetime.datetime, datetime.date, datetime.time, datetime.timedelta)):
        return str(value)
    return value


def request_args(request):
    args = {key: request.query_params.get(key) for key in request.query_params}
    data = request.data
    if hasattr(data, "items"):
        args.update({key: value for key, value in data.items()})
    args.pop("_", None)
    return args


def resolve_method(path):
    head, _, rest = path.partition(".")
    if head not in METHOD_PREFIXES or not rest:
        raise exceptions.PermissionError(f"Method not allowed: {path}")
    module_path, _, attr = f"{METHOD_PREFIXES[head]}.{rest}".rpartition(".")
    try:
        module = importlib.import_module(module_path)
        method = getattr(module, attr)
    except (ImportError, AttributeError):
        raise exceptions.DoesNotExistError(f"Method not found: {path}") from None
    return method


def call_whitelisted(method, http_method, args, trusted=False):
    from apps.frappe.handler import run_doc_method

    if method != run_doc_method and not trusted:
        frappe.is_whitelisted(method)
    allowed = frappe.allowed_http_methods_for_whitelisted_func.get(method)
    if allowed and http_method not in allowed:
        raise exceptions.PermissionError(f"Not allowed to call {method.__name__} via {http_method}")
    import inspect

    signature = inspect.signature(method)
    accepts_kwargs = any(p.kind is inspect.Parameter.VAR_KEYWORD for p in signature.parameters.values())
    if accepts_kwargs:
        kwargs = dict(args)
    else:
        kwargs = {key: value for key, value in args.items() if key in signature.parameters}
    kwargs.pop("cmd", None)
    kwargs.pop("_", None)
    return method(**kwargs)


class MethodCallPermission(BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True
        method_path = view.kwargs.get("method_path", "")
        try:
            method = resolve_method(method_path)
        except (exceptions.PermissionError, exceptions.DoesNotExistError):
            return False
        return method in frappe.guest_methods


@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([MethodCallPermission])
@with_frappe_session
def method_call(request, method_path):
    def run():
        frappe.local.request_ip = request.META.get("REMOTE_ADDR")
        frappe.form_dict.clear()
        frappe.form_dict.update(request_args(request))
        frappe.local.response = frappe._dict(docs=[])
        if method_path == "run_doc_method":
            from apps.frappe.handler import run_doc_method

            result = call_whitelisted(run_doc_method, request.method, request_args(request))
        else:
            method = resolve_method(method_path)
            result = call_whitelisted(method, request.method, request_args(request), trusted=method_path in SPA_BOOT_METHODS)
        response = frappe.local.response
        if result is None and response.get("message") is not None:
            result = response["message"]
        payload = {"message": jsonable(result)}
        for key, value in response.items():
            if key == "message" or key in payload:
                continue
            if key == "docs" and not value:
                continue
            payload[key] = jsonable(value)
        return payload

    return Response(_guard(run))


def _parse(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return value
    return value


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def resource_list(request, doctype):
    def run():
        if request.method == "POST":
            data = dict(request.data)
            data["doctype"] = doctype
            doc = frappe.get_doc(data).insert()
            return {"data": jsonable(doc.as_dict())}
        from apps.frappe import client

        params = request.query_params
        filters = _parse(params.get("filters"))
        fields = _parse(params.get("fields"))
        if isinstance(fields, str) and fields != "*":
            fields = [name.strip() for name in fields.split(",") if name.strip()]
        rows = client.get_list(
            doctype,
            fields=fields,
            filters=filters,
            or_filters=_parse(params.get("or_filters")),
            group_by=params.get("group_by"),
            order_by=params.get("order_by"),
            limit_start=params.get("limit_start"),
            limit_page_length=params.get("limit_page_length", 20),
            as_dict=params.get("as_dict", True),
        )
        return {"data": jsonable(rows)}

    return Response(_guard(run))


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def resource_detail(request, doctype, name):
    def run():
        if request.method == "GET":
            doc = frappe.get_doc(doctype, name)
            doc.check_permission("read")
            doc.apply_fieldlevel_read_permissions()
            return {"data": jsonable(doc.as_dict())}
        if request.method == "PUT":
            doc = frappe.get_doc(doctype, name)
            doc.update(request.data)
            doc.save()
            return {"data": jsonable(doc.as_dict())}
        frappe.delete_doc(doctype, name)
        return {"message": "ok"}

    return Response(_guard(run))
