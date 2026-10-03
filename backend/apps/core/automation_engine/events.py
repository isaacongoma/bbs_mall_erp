# Ported from frappe/automation_engine/events.py (frappe/frappe, MIT). No app-registered event
# schema exists in this port (frappe.get_hooks("automation_events") has no equivalent -- nothing
# in this codebase declares one yet), so `registered_events()` always returns [] and
# `validate_event` only ever allows unregistered events through
# AutomationSettings.allow_unregistered_events, exactly like upstream's own fallback path.
from __future__ import annotations

import json

from django.utils import timezone

from apps.core.automation_engine import settings
from apps.core.automation_engine.queue import WAITING_STATES

TIMEOUT_UNITS = {"Seconds": 1, "Minutes": 60, "Hours": 3600, "Days": 86400}


def emit(event: str, doc=None, payload: dict | None = None, correlation_key: str | None = None) -> dict:
    """Queue matching Custom Event flows and claim correlated waits. Safe to call twice."""
    from django.db import transaction

    validate_event(event)
    payload = {**(payload or {}), "event_name": event}
    _validate_payload_size(payload)
    queued = _queue_event_flows(event, doc, payload)
    resumed = _claim_subscriptions(event, correlation_key, payload)
    if queued or resumed:
        from apps.core.automation_engine.tasks import kick_drainer

        transaction.on_commit(kick_drainer)
    return {"queued": queued, "resumed": resumed}


def schedule_event_wait(context: dict, params: dict, step_key: str, resume_from_idx: int):
    """Park the run: insert the resume queue row due at the timeout, and the subscription that
    a matching emit() can claim before then."""
    from apps.core.automation_engine.runner import resume_row_values
    from apps.core.doctype.automation_event_subscription.automation_event_subscription import (
        AutomationEventSubscription,
    )
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    validate_wait_params(params)
    correlation = _render(params["correlation_key"], context)
    if not correlation:
        raise ValueError("Wait for Event correlation key rendered empty")

    expires_at = timezone.now() + timezone.timedelta(seconds=_timeout_seconds(params))
    queue_row = AutomationTriggerQueue.objects.create(**resume_row_values(context, expires_at, resume_from_idx))
    return AutomationEventSubscription.objects.create(
        event_name=params["event_name"],
        correlation_key=correlation,
        run_id=context["run"].pk,
        step_key=step_key,
        resume_queue=queue_row,
        expires_at=expires_at,
        status="Waiting",
    )


def get_wait_outcome(row) -> dict | None:
    """Settle the wait this resume row belongs to, and report how it ended."""
    from django.db import transaction

    from apps.core.doctype.automation_event_subscription.automation_event_subscription import (
        AutomationEventSubscription,
    )

    with transaction.atomic():
        subscription = (
            AutomationEventSubscription.objects.select_for_update().filter(resume_queue=row).first()
        )
        if not subscription:
            return None
        if subscription.status == "Waiting":
            subscription.status = "Timed Out"
            subscription.save(update_fields=["status"])
        return {
            "outcome": subscription.status,
            "event_name": subscription.event_name,
            "payload": json.loads(subscription.event_payload) if subscription.event_payload else {},
        }


def registered_events(doctype: str | None = None) -> list[dict]:
    return []


def validate_event(event):
    if settings.get("allow_unregistered_events"):
        return
    raise ValueError(f"Unregistered automation event: {event}")


def validate_wait_params(params: dict):
    if not params.get("correlation_key"):
        raise ValueError("Wait for Event requires a correlation key")
    if not int(params.get("timeout_value") or 0):
        raise ValueError("Wait for Event requires a timeout")
    if params.get("timeout_unit") not in TIMEOUT_UNITS:
        raise ValueError(f"Wait for Event timeout unit must be one of {', '.join(TIMEOUT_UNITS)}")


def _queue_event_flows(event: str, doc, payload: dict) -> int:
    from apps.core.automation_engine.dispatch import matches_rule, queue_trigger
    from apps.core.automation_engine.registry import get_custom_event_map

    queued = 0
    doc_dict = {}
    doctype = getattr(doc, "doctype_label", None) if doc else None
    if doc is not None:
        from apps.core.doctype.assignment_rule.assignment_rule_engine import doc_to_condition_dict

        doc_dict = doc_to_condition_dict(doc)
    for rule in get_custom_event_map().get(event, []):
        if rule.get("document_type") and rule["document_type"] != doctype:
            continue
        if doc is not None and not matches_rule(rule, doc_dict, None):
            continue
        queue_trigger(rule["name"], doctype, str(doc.pk) if doc else None, payload=payload)
        queued += 1
    return queued


def _claim_subscriptions(event: str, correlation_key: str | None, payload: dict) -> int:
    from django.db import transaction

    from apps.core.doctype.automation_event_subscription.automation_event_subscription import (
        AutomationEventSubscription,
    )
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    if not correlation_key:
        return 0
    ids = list(
        AutomationEventSubscription.objects.filter(
            event_name=event, correlation_key=correlation_key, status="Waiting"
        ).values_list("pk", flat=True)
    )
    claimed = 0
    for sub_id in ids:
        with transaction.atomic():
            subscription = AutomationEventSubscription.objects.select_for_update().filter(pk=sub_id).first()
            if not subscription or subscription.status != "Waiting":
                continue
            matched = subscription.expires_at > timezone.now()
            subscription.status = "Matched" if matched else "Timed Out"
            subscription.event_payload = json.dumps(payload) if matched else ""
            subscription.save(update_fields=["status", "event_payload"])
            if subscription.resume_queue_id:
                AutomationTriggerQueue.objects.filter(pk=subscription.resume_queue_id).update(
                    run_after=timezone.now(), status="Pending"
                )
            claimed += 1 if matched else 0
    return claimed


def _timeout_seconds(params: dict) -> int:
    return int(params["timeout_value"]) * TIMEOUT_UNITS[params["timeout_unit"]]


def _render(value, context: dict):
    from apps.core.automation_engine.actions.base import _render_template

    if not isinstance(value, str) or "{{" not in value:
        return value
    trigger_doc = context.get("trigger_doc")
    from apps.core.automation_engine.actions.base import _as_dict

    return _render_template(value, {
        "doc": _as_dict(trigger_doc),
        "context": context,
        "payload": context.get("payload") or {},
    })


def _validate_payload_size(payload: dict):
    if len(json.dumps(payload).encode()) > settings.get("event_payload_limit"):
        raise ValueError("Automation event payload is too large")
