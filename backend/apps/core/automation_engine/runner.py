# Ported from frappe/automation_engine/runner.py (frappe/frappe, MIT).
from __future__ import annotations

import json
import time

from django.utils import timezone

from apps.core.automation_engine import flags, settings
from apps.core.automation_engine.actions.base import get_action_registry, parse_params, AutomationParamError, StopAutomation
from apps.core.automation_engine.conditions import condition_values, safe_eval
from apps.core.automation_engine.dispatch import matches_rule
from apps.core.automation_engine.events import get_wait_outcome, schedule_event_wait
from apps.core.automation_engine.queue import clear_effects, mark_effects_delivered, queue_status
from apps.core.automation_engine.registry import clear_automation_cache
from apps.core.automation_engine.relationships import load_record, resolve_relationships

TASK_METHOD = "automation_engine.runner.execute_automation"
WAIT_UNIT_SECONDS = {"Seconds": 1, "Minutes": 60, "Hours": 3600, "Days": 86400}


def automation_task_name(automation: str) -> str:
    return f"Automation Flow: {automation}"


def execute_automation(queue_name: str):
    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    row = AutomationTriggerQueue.objects.get(pk=queue_name)
    event = get_wait_outcome(row) if row.resume_run else None
    rule = AutomationFlow.objects.prefetch_related("action_rows").get(pk=row.automation_id)
    doc = _load_target(row)
    run, steps, snapshot = _run_state(rule, row, doc)

    if doc is None and row.ref_doctype and row.ref_name:
        return _finalize(run, rule, row, "Skipped", steps, error="Target document not found")
    if rule.revalidate_on_run and doc and not matches_rule(_rule_dict(rule), _doc_dict(doc), None):
        return _finalize(run, rule, row, "Skipped", steps, error="Rule no longer matches")
    status, context = _execute_plan(rule, row, run, doc, steps, snapshot, event)
    _finalize(run, rule, row, status, steps, context=context)


def _rule_dict(rule) -> dict:
    return {"condition": rule.condition, "filters": rule.filters, "trigger_type": rule.trigger_type}


def _doc_dict(doc) -> dict:
    from apps.core.doctype.assignment_rule.assignment_rule_engine import doc_to_condition_dict

    return doc_to_condition_dict(doc)


def _execute_plan(rule, row, run, doc, steps, snapshot, event):
    previous_depth = flags.get_depth()
    previous_run = flags.in_automation_run()
    flags.set_depth(row.depth)
    flags.set_in_automation_run(True)
    context = None
    try:
        context = _context(row, run, rule, doc, event)
        status = _run_plan(steps, rule, doc, context, snapshot, row.resume_from_idx or 0)
        return status, context
    except Exception:
        import traceback

        _append_step(steps, {"step_key": "setup"}, len(steps), "Failed", traceback.format_exc(), 0)
        return "Failed", context
    finally:
        flags.set_depth(previous_depth)
        flags.set_in_automation_run(previous_run)


def _run_state(rule, row, doc):
    if row.resume_run:
        return _resumed_run_state(row)
    snapshot = [_action_snapshot(a) for a in rule.action_rows.all()]
    return _create_run(rule, row, snapshot, doc), [], snapshot


def _resumed_run_state(row):
    from apps.core.doctype.background_task.background_task import BackgroundTask

    run = BackgroundTask.objects.get(pk=row.resume_run)
    arguments = json.loads(run.arguments) if run.arguments else {}
    result = json.loads(run.result) if run.result else {}
    return run, result.get("steps") or [], arguments.get("actions_snapshot") or []


def _load_target(row):
    if not (row.ref_doctype and row.ref_name):
        return None
    from apps.crm.doctype_registry import get_doctype_model

    model = get_doctype_model(row.ref_doctype)
    if model is None:
        return None
    doc = model.objects.filter(pk=row.ref_name).first()
    if doc is not None and not getattr(doc, "doctype_label", None):
        doc.doctype_label = row.ref_doctype
    return doc


def _create_run(rule, row, snapshot, doc):
    import uuid

    from apps.core.doctype.background_task.background_task import BackgroundTask

    run = BackgroundTask.objects.create(
        task_id=uuid.uuid4().hex[:20],
        job_id=row.pk,
        task_name=automation_task_name(rule.pk),
        user_id=_execution_user(rule, row, doc),
        method=TASK_METHOD,
        status="Running",
        queue="default",
        ref_doctype=row.ref_doctype,
        ref_docname=row.ref_name,
        started_at=timezone.now(),
        arguments=json.dumps(_task_arguments(rule, row, snapshot)),
        show_progress_bar=False,
        allow_user_cancellation=False,
        allow_user_retry=False,
    )
    return run


def _task_arguments(rule, row, snapshot) -> dict:
    return {
        "automation": rule.pk,
        "automation_title": rule.title,
        "depth": row.depth,
        "event_payload": json.loads(row.event_payload) if row.event_payload else {},
        "actions_snapshot": snapshot,
        "relationships": json.loads(rule.relationships) if rule.relationships else [],
    }


def _action_snapshot(action) -> dict:
    return {
        "idx": action.idx,
        "step_type": action.step_type or "Action",
        "action_type": action.action_type,
        "params": action.params,
        "step_condition": action.step_condition,
        "related_condition": action.related_condition,
        "step_key": action.step_key or f"step_{action.idx}",
        "target": action.target or "trigger",
        "output_alias": action.output_alias,
        "parent_step": action.parent_step,
        "branch": action.branch or "",
    }


def _context(row, run, rule, doc, event=None) -> dict:
    arguments = json.loads(run.arguments) if run.arguments else {}
    result = json.loads(run.result) if run.result else {}
    return {
        "payload": json.loads(row.event_payload) if row.event_payload else {},
        "event": event or {},
        "queue_row": row,
        "run": run,
        "rule": rule,
        "trigger_doc": doc,
        "steps": result.get("step_outputs") or {},
        "records": result.get("records") or resolve_relationships(doc, arguments.get("relationships")),
        "branches": result.get("branches") or {},
    }


def _execution_user(rule, row, doc):
    if rule.run_as == "Triggering User":
        return row.triggered_by_id or None
    if rule.run_as == "Document Owner" and doc:
        return getattr(doc, "owner_id", None)
    return rule.automation_user_id


def _run_plan(steps, rule, doc, context, snapshot, start_idx=0) -> str:
    registry = get_action_registry()
    taken = context["branches"]
    overall = "Success"
    for pos, step in enumerate(snapshot):
        status, detail, duration = _safe_step_outcome(registry, step, doc, context, pos, start_idx, taken)
        if status is None:
            continue
        entry = _append_step(steps, step, pos, status, detail, duration)
        _update_context(context, step, entry)
        if status == "Waiting":
            return "Waiting"
        if status == "Failed":
            overall = "Partially Failed"
            if rule.stop_on_error:
                return "Failed"
    return overall


def _safe_step_outcome(registry, step, doc, context, pos, start_idx, taken):
    try:
        return _step_outcome(registry, step, doc, context, pos, start_idx, taken)
    except Exception:
        import traceback

        return "Failed", traceback.format_exc(), 0


def _step_outcome(registry, step, doc, context, pos, start_idx, taken):
    if not _branch_active(step, taken):
        return None, None, None
    step_type = step.get("step_type") or "Action"
    if step_type == "If":
        return _resolve_if(step, doc, context, pos, start_idx, taken)
    if pos < start_idx:
        return None, None, None
    if not _step_condition_matches(step, doc, context):
        return "Skipped", _skip_detail(step, doc, context), 0
    if step_type == "Wait":
        return _begin_wait(step, context, pos)
    if step_type == "WaitForEvent":
        return _begin_event_wait(step, context, pos)
    return _run_one(registry, step, doc, context, pos)


def _branch_active(step, taken) -> bool:
    parent = step.get("parent_step")
    if not parent:
        return True
    arm = taken.get(_branch_key(parent))
    if arm is None:
        return False
    return (step.get("branch") or "If") == arm


def _branch_key(idx) -> str:
    return str(int(idx or 0))


def _resolve_if(step, doc, context, pos, start_idx, taken):
    key = _branch_key(step.get("idx"))
    forced = _forced_arm(key)
    if pos < start_idx:
        if key in taken:
            return None, None, None
        taken[key] = forced or _evaluated_arm(step, doc, context)
        return None, None, None
    taken[key] = arm = forced or _evaluated_arm(step, doc, context)
    label = "Forced the {0} branch" if forced else "Condition took the {0} branch"
    return "Success", label.format(arm), 0


def _evaluated_arm(step, doc, context) -> str:
    return "If" if _step_condition_matches(step, doc, context) else "Else"


def _forced_arm(key) -> str | None:
    if not flags.in_automation_trial():
        return None
    arm = flags.branch_overrides().get(key)
    return arm if arm in ("If", "Else") else None


def _begin_wait(step, context, pos):
    started = time.monotonic()
    params = _step_params(step)
    if flags.in_automation_trial():
        return "Success", _simulated_wait(params), _ms(started)
    seconds = _wait_seconds(params)
    schedule_wait(context, seconds, pos + 1)
    return "Waiting", f"Waiting {seconds} seconds", _ms(started)


def _simulated_wait(params) -> str:
    return f"Waited {int(params.get('value') or 0)} {params.get('unit') or 'Minutes'} (simulated)"


def _begin_event_wait(step, context, pos):
    started = time.monotonic()
    params = _step_params(step)
    if flags.in_automation_trial():
        return "Success", _simulated_event_wait(params), _ms(started)
    subscription = schedule_event_wait(context, params, step["step_key"], pos + 1)
    return "Waiting", f"Waiting for {subscription.event_name}", _ms(started)


def _simulated_event_wait(params) -> str:
    return f"Waited for {params.get('event_name') or 'event'} (simulated)"


def _wait_seconds(params) -> int:
    unit = params.get("unit") or "Minutes"
    return int(params.get("value") or 0) * WAIT_UNIT_SECONDS.get(unit, 60)


def schedule_wait(context, seconds: int, resume_from_idx: int):
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    run_after = timezone.now() + timezone.timedelta(seconds=seconds)
    AutomationTriggerQueue.objects.create(**resume_row_values(context, run_after, resume_from_idx))


def resume_row_values(context, run_after, resume_from_idx) -> dict:
    row = context["queue_row"]
    return {
        "automation_id": row.automation_id,
        "ref_doctype": row.ref_doctype,
        "ref_name": row.ref_name,
        "status": queue_status(run_after),
        "triggered_at": timezone.now(),
        "run_after": run_after,
        "depth": row.depth,
        "triggered_by_id": row.triggered_by_id,
        "event_payload": row.event_payload,
        "resume_run": context["run"].pk,
        "resume_from_idx": resume_from_idx,
    }


def _run_one(registry, step, doc, context, idx):
    started = time.monotonic()
    handler = registry.get(step.get("action_type"))
    params = _step_params(step)
    for last_attempt in (False, True):
        outcome = _try_action(handler, step, doc, context, params, idx, started)
        if outcome[0] != "Retry":
            return outcome
        if last_attempt:
            return "Failed", outcome[1], outcome[2]


def _try_action(handler, step, doc, context, params, idx, started):
    from django.db import transaction

    try:
        with transaction.atomic():
            target = _target_doc(step, doc, context)
            if not handler:
                raise ValueError(f"Unknown action type: {step.get('action_type')}")
            handler.validate(params, getattr(target, "doctype_label", None) if target else None)
            if not handler.transactional:
                mark_effects_delivered(context["queue_row"].pk)
            return "Success", handler.execute(target, params, context), _ms(started)
    except StopAutomation as error:
        schedule_wait(context, error.resume_after, idx + 1)
        return "Waiting", str(error) or "Automation paused", _ms(started)
    except Exception as error:
        return "Failed", _failure_detail(error), _ms(started)


def _skip_detail(step, doc, context) -> dict:
    condition = step.get("step_condition") or ""
    target = _target_doc(step, doc, context) if condition else None
    return {
        "note": True,
        "detail": "Step condition did not match",
        "condition": condition or step.get("related_condition") or "",
        "condition_values": condition_values(condition, {"doc": _doc_dict(doc) if doc else {}, "target": _doc_dict(target) if target else {}}),
    }


def _failure_detail(error) -> dict:
    import traceback

    tb = traceback.format_exc()
    return {
        "note": True,
        "detail": tb,
        "traceback": tb,
        "message": str(error),
        "exception": f"{type(error).__module__}.{type(error).__name__}",
    }


def _step_params(step) -> dict:
    return parse_params(step.get("params"))


def _step_condition_matches(step, doc, context) -> bool:
    from apps.core.automation_engine.conditions import evaluate_related_condition

    if not evaluate_related_condition(step.get("related_condition"), context):
        return False
    condition = step.get("step_condition")
    if not condition:
        return True
    target = _target_doc(step, doc, context)
    scope = {"doc": _doc_dict(doc) if doc else {}, "target": _doc_dict(target) if target else {}}
    return safe_eval(condition, scope)


def _append_step(steps, step, idx, status, detail, duration):
    note = detail if isinstance(detail, dict) and detail.get("note") else {}
    detail, output = (note["detail"], None) if note else _action_result(detail)
    entry = {
        "step_idx": idx,
        "step_key": step.get("step_key") or f"step_{idx + 1}",
        "action_type": step.get("action_type") or step.get("step_type") or "Action",
        "status": status,
        "detail": (detail or "")[:5000],
        "message": _trim(note.get("message")),
        "exception": note.get("exception"),
        "traceback": _trim(note.get("traceback")),
        "condition": note.get("condition"),
        "condition_values": note.get("condition_values"),
        "output": output,
        "duration_ms": duration,
    }
    steps.append(entry)
    return entry


def _trim(value):
    return value[:5000] if value else None


def _target_doc(step, trigger_doc, context):
    target = step.get("target") or "trigger"
    if target == "trigger":
        return trigger_doc
    reference = context["records"].get(target)
    return load_record(reference) if reference else None


def _update_context(context, step, entry):
    output = entry.get("output") or {}
    if not _within_output_limit(output):
        entry["output"] = output = {"truncated": True}
    context["steps"][entry["step_key"]] = output
    alias = step.get("output_alias")
    if alias and isinstance(output, dict) and output.get("destination_reference"):
        context["records"][alias] = output["destination_reference"]


def _within_output_limit(output) -> bool:
    return len(json.dumps(output).encode()) <= settings.get("step_output_limit")


def _action_result(result):
    if not isinstance(result, dict):
        return result, None
    detail = result.get("detail") or result.get("destination_reference") or "Action completed"
    return str(detail), result


def _ms(started) -> int:
    return int((time.monotonic() - started) * 1000)


def _finalize(run, rule, row, status, steps, error=None, context=None):
    error_summary = error or _error_summary(status, steps)
    for field, value in _run_values(rule, row, status, steps, error_summary, context).items():
        setattr(run, field, value)
    run.save()
    _settle_queue_row(row, status)

    if flags.in_automation_trial():
        clear_effects(row.pk)
        return

    if status == "Failed":
        _record_failure(rule)
    elif status == "Success":
        _reset_failures(rule)

    _publish_update(run, rule, status)


def _publish_update(run, rule, status):
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is None or not run.ref_doctype:
            return
        async_to_sync(channel_layer.group_send)(
            f"automation_{run.ref_doctype}_{run.ref_docname}",
            {"type": "automation.run_update", "automation": rule.pk, "run": run.pk, "status": status},
        )
    except Exception:
        pass  # realtime is best-effort


def _run_values(rule, row, status, steps, error_summary, context=None) -> dict:
    values = {
        "result": json.dumps(_run_result(rule, row, status, steps, error_summary, context)),
        "exception": _first_error_detail(steps) if status == "Failed" else "",
    }
    if status == "Waiting":
        return {**values, "status": "Running"}
    return {**values, "status": "Failed" if status == "Failed" else "Completed", "ended_at": timezone.now(), "progress": 100}


def _settle_queue_row(row, status):
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    if status in ("Success", "Partially Failed", "Waiting"):
        AutomationTriggerQueue.objects.filter(pk=row.pk).delete()
    else:
        AutomationTriggerQueue.objects.filter(pk=row.pk).update(status=status)


def _run_result(rule, row, status, steps, error_summary, context=None) -> dict:
    result = {
        "automation": rule.pk,
        "automation_title": rule.title,
        "automation_status": status,
        "depth": row.depth,
        "error_summary": error_summary,
        "steps": steps,
    }
    if context:
        result.update({
            "step_outputs": context["steps"],
            "records": context["records"],
            "branches": context["branches"],
        })
    return result


def _error_summary(status, steps) -> str | None:
    if status not in ("Failed", "Partially Failed"):
        return None
    failed = next((s for s in steps if s["status"] == "Failed"), None)
    message = (failed or {}).get("message")
    if message:
        return message.splitlines()[0][:140]
    detail = _first_error_detail(steps)
    return detail.splitlines()[-1][:140] if detail else "Failed"


def _first_error_detail(steps) -> str | None:
    for step in steps:
        if step["status"] == "Failed":
            return step["detail"] or "Failed"
    return "Failed"


def _failure_key(rule_name) -> str:
    return f"automation_failures::{rule_name}"


def _record_failure(rule):
    from django.core.cache import cache

    threshold = settings.get("failure_threshold")
    count = cache.get(_failure_key(rule.pk)) or 0
    count += 1
    cache.set(_failure_key(rule.pk), count, 3600)
    if count >= threshold:
        _trip_breaker(rule, threshold)


def _reset_failures(rule):
    from django.core.cache import cache

    cache.delete(_failure_key(rule.pk))


def _trip_breaker(rule, threshold):
    from django.core.cache import cache

    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    reason = f"Auto-disabled after {threshold} consecutive failures"
    AutomationFlow.objects.filter(pk=rule.pk).update(enabled=False, disabled_reason=reason)
    AutomationTriggerQueue.objects.filter(automation_id=rule.pk, status__in=("Pending", "Scheduled")).update(status="Skipped")
    clear_automation_cache(rule.document_type)
    cache.delete(_failure_key(rule.pk))
    _notify_owner(rule, reason)


def _notify_owner(rule, reason):
    if not rule.owner_id:
        return
    from apps.crm.doctype.notification.notification import CRMNotification

    CRMNotification.objects.create(
        to_user_id=rule.owner_id, type="Automation",
        message=reason, notification_text=f"Automation Flow {rule.title} was auto-disabled",
        reference_doctype="Automation Flow", reference_name=rule.pk,
    )
