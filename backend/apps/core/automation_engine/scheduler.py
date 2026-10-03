# Ported from frappe/automation_engine/scheduler.py (frappe/frappe, MIT).
# frappe.core.doctype.scheduled_job_type.scheduled_job_type.parse_cron -> croniter directly.
from __future__ import annotations

import json
from datetime import datetime

from croniter import croniter
from django.utils import timezone

from apps.core.automation_engine import settings
from apps.core.automation_engine.conditions import condition_fieldnames, evaluate_filter_tree, safe_eval
from apps.core.automation_engine.dispatch import queue_trigger

TASK_METHOD = "automation_engine.runner.execute_automation"


def automation_task_name(automation: str) -> str:
    return f"Automation Flow: {automation}"


def next_fire(expression: str, after: datetime) -> datetime | None:
    if not expression:
        return None
    return croniter(expression, after).get_next(datetime)


def _prev_fire(expression: str, before: datetime) -> datetime | None:
    if not expression:
        return None
    return croniter(expression, before + timezone.timedelta(seconds=1)).get_prev(datetime)


def process_cron(now=None):
    """Queue each due Scheduled automation once for its latest cron fire."""
    from django.db import transaction

    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow

    if not settings.is_enabled():
        return
    now = now or timezone.now()
    queued = 0
    rules = AutomationFlow.objects.filter(enabled=True, trigger_type="Scheduled").filter(
        models_q_next_run_due(now)
    )
    for rule in rules:
        fire_at = _prev_fire(rule.cron_expression, now)
        if fire_at and fire_at >= rule.creation:
            queued += _queue_rule(rule, fire_at)
        rule.next_run = next_fire(rule.cron_expression, now)
        AutomationFlow.objects.filter(pk=rule.pk).update(next_run=rule.next_run)
    if queued:
        transaction.on_commit(_kick_drainer)


def models_q_next_run_due(now):
    from django.db.models import Q

    return Q(next_run__isnull=True) | Q(next_run__lte=now)


def _handled_names(automation: str, fire_at: datetime) -> set:
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    active = set(
        AutomationTriggerQueue.objects.filter(
            automation_id=automation, status__in=("Pending", "Scheduled", "Running")
        ).values_list("ref_name", flat=True)
    )
    return active | _completed_names(automation, fire_at)


def _completed_names(automation: str, fire_at: datetime) -> set:
    from apps.core.doctype.background_task.background_task import BackgroundTask

    return set(
        BackgroundTask.objects.filter(
            task_name=automation_task_name(automation), method=TASK_METHOD, creation__gte=fire_at
        ).values_list("ref_docname", flat=True)
    )


def _queue_rule(rule, fire_at: datetime) -> int:
    if rule.document_type:
        return _queue_matching_docs(rule, fire_at)
    if "" in _handled_names(rule.pk, fire_at):
        return 0
    queue_trigger(rule.pk, None, None, payload=_payload(fire_at))
    return 1


def _queue_matching_docs(rule, fire_at: datetime) -> int:
    names = _matching_names(rule)
    if not names:
        return 0
    handled = _handled_names(rule.pk, fire_at)
    queued = 0
    for name in names:
        if name in handled:
            continue
        queue_trigger(rule.pk, rule.document_type, name, payload=_payload(fire_at))
        queued += 1
    return queued


def _matching_names(rule) -> list[str]:
    from apps.crm.doctype_registry import get_doctype_model

    model = get_doctype_model(rule.document_type)
    if model is None:
        return []
    filters = json.loads(rule.filters) if rule.filters else None
    qs = model.objects.all()
    names = [str(pk) for pk in qs.values_list("pk", flat=True)]
    return _condition_filtered(rule, model, names)


def _condition_filtered(rule, model, names: list[str]) -> list[str]:
    if not rule.condition:
        return names
    fields = condition_fieldnames(rule.condition)
    if fields is None or not names:
        return [
            n for n in names
            if safe_eval(rule.condition, {"doc": _doc_dict_for(model, n)})
        ]
    valid = {f.name for f in model._meta.fields}
    if not fields <= valid:
        return [n for n in names if safe_eval(rule.condition, {"doc": _doc_dict_for(model, n)})]
    rows = model.objects.filter(pk__in=names).values("pk", *fields)
    return [str(row["pk"]) for row in rows if safe_eval(rule.condition, {"doc": row})]


def _doc_dict_for(model, pk) -> dict:
    from apps.core.doctype.assignment_rule.assignment_rule_engine import doc_to_condition_dict

    instance = model.objects.filter(pk=pk).first()
    return doc_to_condition_dict(instance) if instance else {}


def _payload(fire_at: datetime) -> dict:
    return {"trigger_type": "Scheduled", "scheduled_fire_at": fire_at.strftime("%Y-%m-%d %H:%M:%S")}


def process_date_based(now=None):
    """Queue Date Based automations for documents whose date field lands on today's offset."""
    from django.db import transaction

    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow

    if not settings.is_enabled():
        return
    today = timezone.localdate(now or timezone.now())
    rules = AutomationFlow.objects.filter(enabled=True, trigger_type="Date Based")
    queued = sum(_queue_date_rule(rule, today) for rule in rules)
    if queued:
        transaction.on_commit(_kick_drainer)


def _queue_date_rule(rule, today) -> int:
    from apps.crm.doctype_registry import get_doctype_model

    if not (rule.document_type and rule.date_field):
        return 0
    model = get_doctype_model(rule.document_type)
    if model is None:
        return 0
    target_date = _target_date(rule, today)
    handled = _handled_names(rule.pk, timezone.datetime.combine(today, timezone.datetime.min.time(), tzinfo=timezone.get_current_timezone()))
    names = [str(pk) for pk in model.objects.filter(**{rule.date_field: target_date}).values_list("pk", flat=True)]
    names = _condition_filtered(rule, model, names)
    queued = 0
    for name in names:
        if name in handled:
            continue
        queue_trigger(rule.pk, rule.document_type, name, payload=_date_payload(rule, today))
        queued += 1
    return queued


def _target_date(rule, today):
    from datetime import timedelta

    offset = int(rule.date_offset or 0)
    if rule.date_direction == "After":
        offset = -offset
    return today + timedelta(days=offset)


def _date_payload(rule, today) -> dict:
    return {"trigger_type": "Date Based", "date_field": rule.date_field, "occurrence_date": str(today)}


def _kick_drainer():
    from apps.core.automation_engine.tasks import kick_drainer

    kick_drainer()
