# DRF wrappers around frappe.automation_engine.api's whitelisted RPCs (frappe/frappe, MIT) --
# the REST surface the Vue builder calls via call('frappe.automation_engine.api.*', ...).
from __future__ import annotations

import json

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.automation_engine import flags
from apps.core.automation_engine.actions.base import AutomationParamError, get_action, get_action_registry
from apps.core.automation_engine.dispatch import queue_trigger
from apps.core.automation_engine.events import registered_events
from apps.core.automation_engine.relationships import get_relationship_definitions
from apps.core.automation_engine.runner import TASK_METHOD, execute_automation

TRIGGER_TYPES = [
    "Doc Created", "Doc Updated", "Field Value Changed", "Doc Deleted",
    "Doc Submitted", "Doc Cancelled", "Date Based", "Scheduled", "Custom Event", "Manual",
]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_automation_capabilities(request):
    doctype = request.query_params.get("doctype") or None
    trigger_type = request.query_params.get("trigger_type") or None
    return Response({
        "triggers": TRIGGER_TYPES,
        "custom_events": registered_events(),
        "trigger_events": registered_events(doctype) if doctype else [],
        "fields": _doc_fields(doctype) if doctype else [],
        "relationships": get_relationship_definitions(doctype),
        "actions": [a.as_dict() for a in get_action_registry().values() if _applies(a, doctype, trigger_type)],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def validate_action_params(request):
    p = request.data
    try:
        action = get_action(p.get("action_type"))
        _validate_action_context(action, p.get("doctype"), p.get("trigger_type"))
        params = json.loads(p["params"]) if isinstance(p.get("params"), str) else (p.get("params") or {})
        action.validate(params, p.get("doctype"))
        return Response({"valid": True, "errors": []})
    except AutomationParamError as e:
        return Response({"valid": False, "errors": [{"fieldname": e.fieldname, "message": str(e)}]})
    except Exception as e:
        return Response({"valid": False, "errors": [{"fieldname": None, "message": str(e)}]})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_param_options(request):
    p = request.data
    action = get_action(p.get("action_type"))
    field = next((f for f in action.params_schema if f["fieldname"] == p.get("fieldname")), None)
    if not field:
        return Response({"detail": f"Unknown parameter: {p.get('fieldname')}"}, status=400)
    parsed_params = json.loads(p["params"]) if p.get("params") else {}
    resolver = OPTION_RESOLVERS.get(field.get("options_source"))
    return Response(resolver(p.get("doctype"), parsed_params, p.get("search_text")) if resolver else [])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_manually(request):
    from django.db import transaction

    from apps.core.automation_engine.tasks import kick_drainer
    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow

    p = request.data
    rule = AutomationFlow.objects.get(pk=p.get("automation"))
    docname = p.get("docname")
    if not rule.document_type and docname:
        return Response({"detail": "Document-less automations do not accept a document name"}, status=400)

    payload = {"manual": True}
    queue_trigger(rule.pk, rule.document_type, docname, payload=payload, depth=1)
    transaction.on_commit(kick_drainer)
    return Response({"queued": True})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_runs(request):
    from apps.core.doctype.background_task.background_task import BackgroundTask

    reference_doctype = request.query_params.get("reference_doctype")
    reference_name = request.query_params.get("reference_name")
    tasks = BackgroundTask.objects.filter(
        ref_doctype=reference_doctype, ref_docname=reference_name, method=TASK_METHOD
    ).order_by("-creation")
    return Response([_serialize_run(t) for t in tasks])


def _serialize_run(task) -> dict:
    result = json.loads(task.result) if task.result else {}
    return {
        "name": task.pk,
        "automation": result.get("automation"),
        "automation_title": result.get("automation_title"),
        "status": result.get("automation_status") or task.status,
        "started_at": task.started_at,
        "ended_at": task.ended_at,
        "error_summary": result.get("error_summary") or task.exception,
    }


TRIAL_LOCK_NAME = "automation_trial"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def trial_run(request):
    """Execute an automation for real, inside a transaction that's always rolled back --
    the runner builds its trace in memory, so the trace survives the rollback."""
    from django.db import transaction

    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    p = request.data
    rule = AutomationFlow.objects.get(pk=p.get("automation"))
    docname = p.get("docname")
    overrides = _branch_overrides(rule, p.get("branch_overrides"))

    from django.utils import timezone

    try:
        with transaction.atomic():
            flags.set_in_automation_trial(True)
            flags.set_branch_overrides(overrides)
            row = AutomationTriggerQueue.objects.create(
                automation=rule, ref_doctype=rule.document_type, ref_name=docname or "",
                status="Running", triggered_at=timezone.now(), depth=1,
                event_payload=json.dumps({"trial": True}),
            )
            execute_automation(row.pk)
            result = _trial_result(row.pk, docname)
            raise _RollbackTrial()
    except _RollbackTrial:
        pass
    finally:
        flags.set_in_automation_trial(False)
        flags.set_branch_overrides(None)
    return Response(result)


class _RollbackTrial(Exception):
    """Raised inside the trial's atomic block purely to force a rollback after reading the
    Background Task result -- Django's transaction.atomic() only rolls back on an exception."""


def _trial_result(row_name, docname) -> dict:
    from apps.core.doctype.background_task.background_task import BackgroundTask

    task = BackgroundTask.objects.filter(job_id=row_name).first()
    result = json.loads(task.result) if task and task.result else {}
    return {
        "status": result.get("automation_status") or "Failed",
        "document": docname,
        "steps": result.get("steps") or [],
        "branches": result.get("branches") or {},
        "error_summary": result.get("error_summary"),
    }


def _branch_overrides(rule, overrides) -> dict:
    overrides = json.loads(overrides) if isinstance(overrides, str) else (overrides or {})
    chosen = {}
    for idx, arm in overrides.items():
        if arm not in ("If", "Else"):
            raise ValueError(f"Branch for step {idx} must be If or Else")
        if not rule.if_step_at(int(idx)):
            raise ValueError(f"Step {idx} is not an If step")
        chosen[str(int(idx))] = arm
    return chosen


def _doc_fields(doctype: str) -> list:
    from apps.core.meta import get_doctype_meta

    meta = get_doctype_meta(doctype) or {"fields": []}
    no_value_fieldtypes = {"Section Break", "Column Break", "Tab Break", "HTML", "Button"}
    return [
        {"fieldname": f["fieldname"], "label": f.get("label"), "fieldtype": f["fieldtype"], "options": f.get("options")}
        for f in meta["fields"]
        if f.get("fieldtype") not in no_value_fieldtypes
    ]


def _applies(action, doctype, trigger_type=None) -> bool:
    if action.requires_document and not doctype:
        return False
    if doctype and action.applicable_doctypes is not None and doctype not in action.applicable_doctypes:
        return False
    return not trigger_type or not action.supported_trigger_types or trigger_type in action.supported_trigger_types


def _validate_action_context(action, doctype, trigger_type):
    if action.requires_document and not doctype:
        raise AutomationParamError("This action requires a Document Type")
    if trigger_type and action.supported_trigger_types and trigger_type not in action.supported_trigger_types:
        raise AutomationParamError("This action does not support the selected trigger")


def _user_options(doctype, params, search_text):
    from apps.core.models import User

    qs = User.objects.filter(is_active=True)
    if search_text:
        qs = qs.filter(email__icontains=search_text)
    return [{"name": u.pk, "full_name": (u.get_full_name() or u.email)} for u in qs[:20]]


def _notification_recipient_options(doctype, params, search_text):
    from apps.core.automation_engine.actions.core import recipient_tokens

    tokens = [t for t in recipient_tokens() if _matches_search(t, search_text)]
    return tokens + _user_options(doctype, params, search_text)


def _matches_search(token, search_text):
    if not search_text:
        return True
    return search_text.lower() in f"{token['name']} {token['full_name']}".lower()


OPTION_RESOLVERS = {
    "doc_fields": lambda doctype, params, search_text: _doc_fields(doctype),
    "users": _user_options,
    "notification_recipients": _notification_recipient_options,
}
