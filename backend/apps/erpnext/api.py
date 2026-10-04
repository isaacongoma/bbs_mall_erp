import datetime
import decimal
import importlib
import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

import frappe
from apps.erpnext.views import _guard, with_frappe_session
from apps.frappe import exceptions
from apps.frappe.model.document import Document

METHOD_PREFIXES = {"frappe": "apps.frappe", "erpnext": "apps.erpnext"}
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


def call_whitelisted(method, http_method, args):
    frappe.is_whitelisted(method)
    allowed = getattr(method, "allowed_http_methods", None)
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
    return method(**kwargs)


@api_view(["GET", "POST", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@with_frappe_session
def method_call(request, method_path):
    def run():
        frappe.form_dict.clear()
        frappe.form_dict.update(request_args(request))
        if method_path == "run_doc_method":
            from apps.frappe.handler import run_doc_method

            result = call_whitelisted(run_doc_method, request.method, request_args(request))
        else:
            method = resolve_method(method_path)
            result = call_whitelisted(method, request.method, request_args(request))
        return {"message": jsonable(result)}

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
