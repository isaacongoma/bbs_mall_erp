# Ported from frappe/automation_engine/actions/core.py (frappe/frappe, MIT), adapted to this
# port's schema: no generic DocType meta (apps.crm.doctype_registry is the fixed doctype map),
# no Email Template doctype, no frappe.desk.form.assign_to (ToDo is created directly, the same
# way apps/core/assignable.py's AssignableMixin does it for Lead/Deal), and no Server Script
# doctype -- RunScript here only supports the inline "script" param, executed through
# RestrictedPython (see automation_engine/script_sandbox.py), the same library real Frappe's
# safe_exec wraps for Server Scripts.
from __future__ import annotations

import json
from typing import ClassVar
from urllib.parse import urljoin, urlparse

from apps.core.automation_engine.actions.base import (
    USER_CONTROL,
    AutomationAction,
    AutomationParamError,
    render_value,
)

NUMERIC_FIELDTYPES = ("Int", "Float", "Currency", "Percent")
HTTP_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE")
ALLOWED_SCHEMES = ("http", "https")
DEFAULT_WEBHOOK_TIMEOUT = 30
MAX_WEBHOOK_TIMEOUT = 120
MAX_REDIRECTS = 5
WEBHOOK_RESPONSE_LIMIT = 2000


def _require_doc(doc, action_type):
    if doc is None:
        raise AutomationParamError(f"{action_type} requires a target document")


def _as_list(value) -> list:
    if not value:
        return []
    if isinstance(value, str):
        parsed = json.loads(value) if value.strip().startswith("[") else value
        return list(parsed) if isinstance(parsed, list) else [parsed]
    return list(value)


def _get_model(doctype):
    from apps.crm.doctype_registry import get_doctype_model

    return get_doctype_model(doctype)


def _get_field_meta(doctype, field):
    from apps.core.meta import get_doctype_meta

    meta = get_doctype_meta(doctype) or {"fields": []}
    return next((f for f in meta["fields"] if f.get("fieldname") == field), None)


class SetFieldValue(AutomationAction):
    action_type = "SetFieldValue"
    label = "Set Field Value"
    description = "Set value of document fields."
    params_schema: ClassVar[list] = [
        {"fieldname": "field", "label": "Field", "fieldtype": "Select", "options_source": "doc_fields"},
        {"fieldname": "value", "label": "Value", "fieldtype": "Data"},
        {"fieldname": "values", "label": "Field Values", "fieldtype": "JSON"},
    ]

    def validate(self, params, doctype):
        pairs = self._pairs(params)
        if not pairs:
            raise AutomationParamError("Set at least one field", fieldname="field")
        if not doctype:
            return
        for field in pairs:
            if not _get_field_meta(doctype, field):
                raise AutomationParamError(f"{doctype} has no field {field}", fieldname="field")

    def execute(self, doc, params, context):
        _require_doc(doc, self.label)
        pairs = self._pairs(params)
        for field, value in pairs.items():
            setattr(doc, field, render_value(value, doc, context))
        doc.save()
        return f"Set {', '.join(pairs)}"

    def _pairs(self, params) -> dict:
        values = params.get("values") or {}
        if isinstance(values, str):
            values = json.loads(values) if values.strip() else {}
        pairs = dict(values)
        if params.get("field"):
            pairs[params["field"]] = params.get("value")
        return pairs


class CreateDocument(AutomationAction):
    action_type = "CreateDocument"
    label = "Create Document"
    description = "Create a new document."
    requires_document = False
    output_schema: ClassVar[dict] = {"destination_reference": {"doctype": "Dynamic", "cardinality": "one"}}
    params_schema: ClassVar[list] = [
        {"fieldname": "doctype", "label": "Document Type", "fieldtype": "Link", "options": "DocType", "reqd": 1},
        {"fieldname": "values", "label": "Field Values", "fieldtype": "JSON"},
    ]

    def validate(self, params, doctype):
        if not params.get("doctype"):
            raise AutomationParamError("Target Document Type is required", fieldname="doctype")
        if _get_model(params["doctype"]) is None:
            raise AutomationParamError("Unknown DocType", fieldname="doctype")

    def output_doctype(self, params):
        return params.get("doctype")

    def execute(self, doc, params, context):
        model = _get_model(params["doctype"])
        values = params.get("values")
        if isinstance(values, str):
            values = json.loads(values) if values.strip() else {}
        target = model()
        for field, value in (values or {}).items():
            setattr(target, field, render_value(value, doc, context))
        target.save()
        return {
            "detail": f"Created {params['doctype']} {target.pk}",
            "destination_reference": {"doctype": params["doctype"], "name": str(target.pk)},
        }


class IncrementFieldValue(AutomationAction):
    action_type = "IncrementFieldValue"
    label = "Increment Field Value"
    description = "Add a number to a field on the target document."
    params_schema: ClassVar[list] = [
        {"fieldname": "field", "label": "Field", "fieldtype": "Select", "options_source": "doc_fields", "reqd": 1},
        {"fieldname": "amount", "label": "Amount", "fieldtype": "Float", "reqd": 1},
    ]

    def validate(self, params, doctype):
        field = params.get("field")
        if not field:
            raise AutomationParamError("Field is required", fieldname="field")
        if not doctype:
            return
        meta = _get_field_meta(doctype, field)
        if not meta or meta.get("fieldtype") not in NUMERIC_FIELDTYPES:
            raise AutomationParamError("Choose a numeric field", fieldname="field")

    def execute(self, doc, params, context):
        from django.db import transaction

        _require_doc(doc, self.label)
        field = params["field"]
        amount = float(render_value(params.get("amount"), doc, context) or 0)
        with transaction.atomic():
            locked = type(doc).objects.select_for_update().get(pk=doc.pk)
            old_value = float(getattr(locked, field) or 0)
            setattr(locked, field, old_value + amount)
            locked.save()
        return {
            "detail": f"Changed {field} by {amount}",
            "old_value": old_value,
            "new_value": old_value + amount,
            "delta": amount,
        }


OWNER_TOKEN = "@owner"
ASSIGNEES_TOKEN = "@assignees"


def recipient_tokens() -> list[dict]:
    return [
        {"name": OWNER_TOKEN, "full_name": "Document owner"},
        {"name": ASSIGNEES_TOKEN, "full_name": "Assignees"},
    ]


def resolve_recipients(recipients: list, doc) -> list:
    resolved = []
    for recipient in recipients:
        if recipient == OWNER_TOKEN:
            resolved.append(getattr(doc, "owner_id", None) if doc else None)
        elif recipient == ASSIGNEES_TOKEN:
            resolved.extend(_assignees(doc))
        else:
            resolved.append(recipient)
    return list(dict.fromkeys(u for u in resolved if u))


def _assignees(doc) -> list:
    if doc is None:
        return []
    from apps.core.assignments import assigned_user_pks

    doctype = getattr(doc, "doctype_label", None)
    if not doctype:
        return []
    return assigned_user_pks(doctype, doc.pk)


class SendNotification(AutomationAction):
    action_type = "SendNotification"
    label = "Send Notification"
    description = "Send an email or in-app notification."
    params_schema: ClassVar[list] = [
        {"fieldname": "channel", "label": "Channel", "fieldtype": "Select", "options": "Email\nSystem", "reqd": 1},
        {
            "fieldname": "recipients", "label": "Recipients", "fieldtype": "JSON", "reqd": 1,
            "control": USER_CONTROL, "options_source": "notification_recipients",
        },
        {"fieldname": "subject", "label": "Subject", "fieldtype": "Data"},
        {"fieldname": "message", "label": "Message", "fieldtype": "Text Editor"},
    ]

    def validate(self, params, doctype):
        if not _as_list(params.get("recipients")):
            raise AutomationParamError("At least one recipient is required", fieldname="recipients")

    def execute(self, doc, params, context):
        subject = render_value(params.get("subject") or "", doc, context)
        message = render_value(params.get("message") or "", doc, context)
        recipients = resolve_recipients(_as_list(params.get("recipients")), doc)
        if not recipients:
            return "No recipients to notify"
        if params.get("channel") == "System":
            return self._notify_system(doc, recipients, subject, message)
        return self._send_email(doc, recipients, subject, message)

    def _send_email(self, doc, recipients, subject, message):
        from django.core.mail import send_mail

        from apps.core.models import User

        by_id = User.objects.filter(pk__in=[r for r in recipients if str(r).isdigit()]).values_list(
            "email", flat=True
        )
        literal_emails = [r for r in recipients if "@" in str(r)]
        emails = list(by_id) + literal_emails
        if not emails:
            return "No recipients to notify"
        send_mail(subject or "(no subject)", message or "", None, emails, fail_silently=False)
        return f"Emailed {', '.join(emails)}"

    def _notify_system(self, doc, recipients, subject, message):
        _require_doc(doc, self.label)
        from apps.crm.doctype.notification.notification import CRMNotification

        doctype = getattr(doc, "doctype_label", "")
        for user_id in recipients:
            CRMNotification.objects.create(
                to_user_id=user_id, type="Automation",
                message=message or subject or "", notification_text=subject or "",
                reference_doctype=doctype, reference_name=str(doc.pk),
            )
        return f"Notified {', '.join(str(r) for r in recipients)}"


class AssignToUser(AutomationAction):
    action_type = "AssignToUser"
    label = "Assign to User"
    description = "Assign the document to user(s)."
    params_schema: ClassVar[list] = [
        {
            "fieldname": "assign_to", "label": "Assign To", "fieldtype": "JSON", "reqd": 1,
            "control": USER_CONTROL, "options_source": "users",
        },
        {"fieldname": "description", "label": "Description", "fieldtype": "Data"},
    ]

    def validate(self, params, doctype):
        if not _as_list(params.get("assign_to")):
            raise AutomationParamError("At least one assignee is required", fieldname="assign_to")

    def execute(self, doc, params, context):
        from apps.core.assignments import create_assignment, has_open_assignment

        _require_doc(doc, self.label)
        doctype = getattr(doc, "doctype_label", "")
        users = _as_list(params.get("assign_to"))
        description = render_value(params.get("description"), doc, context) or doctype
        for user_id in users:
            if not has_open_assignment(doctype, doc.pk, user_id):
                create_assignment(doctype, doc.pk, user_id, description=description)
        return f"Assigned to {', '.join(str(u) for u in users)}"


class CallWebhook(AutomationAction):
    action_type = "CallWebhook"
    label = "Call Webhook"
    description = "Send an HTTP request to an external URL."
    requires_document = False
    transactional = False
    params_schema: ClassVar[list] = [
        {"fieldname": "url", "label": "URL", "fieldtype": "Data", "reqd": 1},
        {"fieldname": "method", "label": "Method", "fieldtype": "Select", "options": "\n".join(HTTP_METHODS)},
        {"fieldname": "headers", "label": "Headers", "fieldtype": "JSON"},
        {"fieldname": "payload", "label": "Payload", "fieldtype": "JSON"},
        {"fieldname": "timeout", "label": "Timeout (seconds)", "fieldtype": "Int"},
    ]
    output_schema: ClassVar[dict] = {"status_code": {"fieldtype": "Int"}, "response": {"fieldtype": "Text"}}

    def validate(self, params, doctype):
        url = (params.get("url") or "").strip()
        if not url:
            raise AutomationParamError("URL is required", fieldname="url")
        if "{{" not in url:
            _check_url_shape(url)
        if (params.get("method") or "POST").upper() not in HTTP_METHODS:
            raise AutomationParamError("Unsupported HTTP method", fieldname="method")
        timeout = int(params.get("timeout") or 0)
        if timeout < 0 or timeout > MAX_WEBHOOK_TIMEOUT:
            raise AutomationParamError(f"Timeout must be between 1 and {MAX_WEBHOOK_TIMEOUT} seconds", fieldname="timeout")
        _json_param(params.get("headers"), "headers")
        _json_param(params.get("payload"), "payload")

    def execute(self, doc, params, context):
        url = render_value(params.get("url"), doc, context)
        method = (params.get("method") or "POST").upper()
        headers = _rendered_json(params.get("headers"), doc, context, "headers")
        payload = _rendered_json(params.get("payload"), doc, context, "payload")
        timeout = int(params.get("timeout") or 0) or DEFAULT_WEBHOOK_TIMEOUT
        response = _send_guarded_request(method, url, headers, payload, timeout)
        body = (response.text or "")[:WEBHOOK_RESPONSE_LIMIT]
        if response.status_code >= 400:
            raise ValueError(f"{method} {url} returned {response.status_code}: {body}")
        return {
            "detail": f"{method} {url} returned {response.status_code}",
            "status_code": response.status_code,
            "response": body,
        }


class RunScript(AutomationAction):
    action_type = "RunScript"
    label = "Run Script"
    description = "Run a restricted Python script against the target document."
    requires_document = False
    # A script is arbitrary (restricted) code: it may set fields, create records or call out
    # through requests it makes itself, and nothing here can tell whether it already acted.
    transactional = False
    params_schema: ClassVar[list] = [
        {"fieldname": "script", "label": "Script", "fieldtype": "Code", "options": "Python", "reqd": 1},
    ]

    def validate(self, params, doctype):
        from apps.core.automation_engine.script_sandbox import ScriptCompileError, compile_restricted

        script = (params.get("script") or "").strip()
        if not script:
            raise AutomationParamError("Write a script", fieldname="script")
        try:
            compile_restricted(script)
        except ScriptCompileError as error:
            raise AutomationParamError(str(error), fieldname="script") from error

    def execute(self, doc, params, context):
        from apps.core.automation_engine.script_sandbox import run_restricted

        scope = {
            "doc": doc,
            "target": doc,
            "trigger": (context or {}).get("trigger_doc") or doc,
            "payload": (context or {}).get("payload") or {},
        }
        result = dict(run_restricted(params.get("script") or "", scope) or {})
        result.setdefault("detail", "Ran script")
        return result


def _check_url_shape(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise AutomationParamError("URL must be http or https", fieldname="url")
    if not parsed.hostname:
        raise AutomationParamError("URL has no host", fieldname="url")


def _guard_url(url: str):
    """Refuse anything that resolves off the public internet -- the flow author picks the URL,
    but the webhook step must not be able to reach internal network addresses."""
    import ipaddress
    import socket

    _check_url_shape(url)
    hostname = urlparse(url).hostname
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except socket.gaierror as error:
        raise AutomationParamError(f"Could not resolve host: {hostname}") from error
    for record in addr_info:
        try:
            address = ipaddress.ip_address(record[4][0])
        except (ValueError, IndexError):
            continue
        if not address.is_global:
            raise AutomationParamError("Requests to internal network addresses are not permitted", fieldname="url")


def _send_guarded_request(method, url, headers, payload, timeout):
    import requests

    body = json.dumps(payload) if payload else None
    headers = {"Content-Type": "application/json", **(headers or {})} if body else dict(headers or {})
    for _hop in range(MAX_REDIRECTS + 1):
        _guard_url(url)
        response = requests.request(method=method, url=url, data=body, headers=headers, timeout=timeout, allow_redirects=False)
        location = response.headers.get("Location") if response.is_redirect else None
        if not location:
            return response
        url = urljoin(url, location)
        if response.status_code in (301, 302, 303) and method != "HEAD":
            method, body = "GET", None
    raise AutomationParamError("Too many redirects", fieldname="url")


def _json_param(value, fieldname):
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    parsed = json.loads(value)
    if not isinstance(parsed, dict):
        raise AutomationParamError(f"{fieldname} must be a JSON object", fieldname=fieldname)
    return parsed


def _rendered_json(value, doc, context, fieldname):
    return {k: render_value(v, doc, context) for k, v in _json_param(value, fieldname).items()}


CORE_ACTIONS = [
    SetFieldValue,
    IncrementFieldValue,
    CreateDocument,
    SendNotification,
    AssignToUser,
    CallWebhook,
    RunScript,
]
