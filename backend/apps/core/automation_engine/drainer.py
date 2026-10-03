# Ported from frappe/automation_engine/drainer.py (frappe/frappe, MIT).
# frappe.db.savepoint -> Django's transaction.atomic() (nested atomic blocks compile to real
# SQL savepoints). SELECT ... FOR UPDATE SKIP LOCKED is Postgres-only here (this port only
# targets Postgres -- see config/settings/base.py's DATABASE_URL), so the MariaDB-version
# fallback upstream carries is dropped.
from __future__ import annotations

import time

from django.db import connection, transaction
from django.utils import timezone

from apps.core.automation_engine import settings

DEFAULT_BATCH_SIZE = 500
DRAIN_TIME_BUDGET_SECONDS = 240


def drain(batch_size=DEFAULT_BATCH_SIZE, max_batches=None, executor=None):
    """Claim and execute due waiting rows until the queue drains or the time budget runs out."""
    from apps.core.automation_engine import runner

    if not settings.is_enabled():
        return
    executor = executor or runner.execute_automation

    promote_due_scheduled()
    deadline = time.monotonic() + drain_time_budget()
    batches = 0
    while True:
        names = claim_batch(batch_size)
        if not names:
            break
        execute_batch(executor, names)
        batches += 1
        if max_batches and batches >= max_batches:
            break
        if time.monotonic() >= deadline:
            break

    if _has_due_pending():
        from apps.core.automation_engine.tasks import kick_drainer

        kick_drainer()


def drain_time_budget() -> float:
    configured = settings.get("drain_seconds")
    return configured if configured > 0 else DRAIN_TIME_BUDGET_SECONDS


def execute_batch(executor, names):
    size = max(1, int(settings.get("commit_every")))
    for start in range(0, len(names), size):
        _execute_group(executor, names[start : start + size])


def _execute_group(executor, names):
    for name in names:
        _execute_in_savepoint(executor, name)


def _execute_in_savepoint(executor, name):
    from apps.core.automation_engine.queue import clear_effects, effects_delivered

    if effects_delivered(name):
        _fail_delivered_row(name)
        return
    try:
        with transaction.atomic():
            executor(name)
        clear_effects(name)
    except Exception:
        import logging

        logging.getLogger(__name__).exception("Automation run failed: %s", name)
        _settle_escaped_row(name)


def _settle_escaped_row(name):
    from apps.core.automation_engine.queue import effects_delivered
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    if effects_delivered(name):
        return _fail_delivered_row(name)

    row = AutomationTriggerQueue.objects.filter(pk=name).first()
    if not row:
        return
    attempt = row.attempt + 1
    exhausted = attempt >= int(settings.get("max_attempts"))
    AutomationTriggerQueue.objects.filter(pk=name).update(attempt=attempt, status="Failed" if exhausted else "Pending")


def _fail_delivered_row(name):
    import logging

    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    AutomationTriggerQueue.objects.filter(pk=name).update(status="Failed")
    logging.getLogger(__name__).error(
        "Automation run not retried: %s (already sent something outside the database)", name
    )


def promote_due_scheduled():
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    AutomationTriggerQueue.objects.filter(status="Scheduled", run_after__lte=timezone.now()).update(status="Pending")


def claim_batch(batch_size=DEFAULT_BATCH_SIZE) -> list[str]:
    """Atomically claim up to `batch_size` due waiting rows and mark them Running."""
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    now = timezone.now()
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT name FROM automation_trigger_queue
                WHERE status IN ('Pending', 'Scheduled') AND (run_after IS NULL OR run_after <= %s)
                ORDER BY triggered_at
                LIMIT %s
                FOR UPDATE SKIP LOCKED
                """,
                [now, batch_size],
            )
            names = [row[0] for row in cursor.fetchall()]
        if names:
            AutomationTriggerQueue.objects.filter(pk__in=names).update(status="Running", modified=now)
    return names


def _has_due_pending() -> bool:
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    return AutomationTriggerQueue.objects.filter(status__in=("Pending", "Scheduled")).filter(
        _due_q()
    ).exists()


def _due_q():
    from django.db.models import Q

    return Q(run_after__isnull=True) | Q(run_after__lte=timezone.now())


def drain_due():
    """Scheduler safety net: requeue crashed claims, then drain inline."""
    requeue_stale_running()
    drain()


def requeue_stale_running():
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    cutoff = timezone.now() - timezone.timedelta(minutes=int(settings.get("stale_running_minutes")))
    AutomationTriggerQueue.objects.filter(status="Running", modified__lt=cutoff).update(status="Pending")


def purge_queue():
    from apps.core.doctype.automation_event_subscription.automation_event_subscription import (
        AutomationEventSubscription,
    )
    from apps.core.doctype.automation_trigger_queue.automation_trigger_queue import (
        AutomationTriggerQueue,
    )

    cutoff = timezone.now() - timezone.timedelta(days=int(settings.get("queue_retention_days")))
    AutomationTriggerQueue.objects.filter(status__in=("Failed", "Skipped"), modified__lt=cutoff).delete()
    AutomationEventSubscription.objects.filter(
        status__in=("Matched", "Timed Out", "Cancelled"), modified__lt=cutoff
    ).delete()
