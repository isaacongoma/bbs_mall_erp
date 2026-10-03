# Ported from frappe/automation_engine/dispatch.py (frappe/frappe, MIT). The Django-signals
# wiring that calls run_automations() lives in apps/core/automation_engine/signals.py.
from __future__ import annotations

from django.utils import timezone

from apps.core.automation_engine import flags, settings
from apps.core.automation_engine.conditions import evaluate_filter_tree, safe_eval
from apps.core.automation_engine.queue import queue_status
from apps.core.automation_engine.registry import get_automations_for

# Real Frappe wires this per-method (after_insert/on_update/on_change/on_submit/on_cancel/
# on_trash); this port only fires the four doc lifecycle events BBS-ERP's Django models
# actually have, via post_save/post_delete signals (see signals.py). Submitted/Cancelled are
# real trigger-type choices for schema parity but never fire here -- nothing in this whole
# clone implements Frappe's submittable-document workflow.
CREATED = "Doc Created"
UPDATED = "Doc Updated"
FIELD_CHANGED = "Field Value Changed"
DELETED = "Doc Deleted"


def run_automations(doctype: str, instance, trigger_type: str, before: dict | None, user_id):
    """Entry point called from signals.py for every registered doctype's save/delete."""
    if not _dispatch_allowed():
        return

    rules = get_automations_for(doctype)
    if not rules:
        return

    doc_dict = _doc_dict(instance)
    matched = [r for r in rules if r["trigger_type"] == trigger_type and matches_rule(r, doc_dict, before)]
    if not matched:
        return

    # Enforce recursion depth only once there's real work to do -- checking earlier would refuse
    # every unrelated save (Background Tasks, queue rows) that happens to run inside a flow.
    depth = flags.get_depth() + 1
    if depth > settings.get("max_depth"):
        return

    for rule in matched:
        queue_trigger(rule["name"], doctype, str(instance.pk), depth=depth, triggered_by_id=user_id)
    _kick_drainer_after_commit()


def matches_rule(rule: dict, doc: dict, before: dict | None) -> bool:
    try:
        if rule["trigger_type"] == FIELD_CHANGED and not _field_changed(rule, doc, before):
            return False
        if rule.get("filters"):
            import json

            if not evaluate_filter_tree(doc, json.loads(rule["filters"])):
                return False
        if not rule.get("condition"):
            return True
        return bool(safe_eval(rule["condition"], {"doc": doc}))
    except Exception:
        return False


def _field_changed(rule: dict, doc: dict, before: dict | None) -> bool:
    if not before:
        return False
    field = rule.get("trigger_field")
    old, new = before.get(field), doc.get(field)
    if old == new:
        return False
    if rule.get("from_value") not in (None, "") and str(old) != str(rule["from_value"]):
        return False
    if rule.get("to_value") not in (None, "") and str(new) != str(rule["to_value"]):
        return False
    return True


def queue_trigger(automation: str, doctype: str | None, docname: str | None, run_after=None, payload=None, depth=0, triggered_by_id=None):
    """Insert (or refresh) the waiting queue row for this automation and document."""
    import json

    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    existing = None
    if doctype and docname:
        existing = AutomationTriggerQueue.objects.filter(
            automation_id=automation, ref_doctype=doctype, ref_name=docname,
            status__in=("Pending", "Scheduled"), resume_run="",
        ).first()
    if existing:
        return _touch_row(existing, run_after, payload, depth)

    row = AutomationTriggerQueue.objects.create(
        automation_id=automation,
        ref_doctype=doctype or "",
        ref_name=docname or "",
        status=queue_status(run_after),
        triggered_at=timezone.now(),
        triggered_by_id=triggered_by_id,
        run_after=run_after,
        event_payload=json.dumps(payload) if payload else "",
        depth=depth,
    )
    return row.name


def _touch_row(row, run_after, payload, depth):
    import json

    row.triggered_at = timezone.now()
    row.run_after = run_after
    row.status = queue_status(run_after)
    row.depth = max(row.depth, depth)
    if payload is not None:
        row.event_payload = json.dumps(payload)
    row.save(update_fields=["triggered_at", "run_after", "status", "depth", "event_payload"])
    return row.name


def _dispatch_allowed() -> bool:
    return settings.is_enabled()


def _doc_dict(instance) -> dict:
    from apps.core.doctype.assignment_rule.assignment_rule_engine import doc_to_condition_dict

    return doc_to_condition_dict(instance)


def _kick_drainer_after_commit():
    from django.db import transaction

    from apps.core.automation_engine.tasks import kick_drainer

    transaction.on_commit(kick_drainer)
