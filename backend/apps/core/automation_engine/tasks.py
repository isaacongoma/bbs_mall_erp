# Celery wiring for the automation engine. frappe.enqueue(..., queue=DRAIN_QUEUE,
# job_id=..., deduplicate=True) -> Celery's own task-id-based dedup isn't reliable across
# brokers, so kick_drainer relies on the drainer itself being idempotent (claim_batch's
# SKIP LOCKED means two overlapping drains just split the rows) rather than true dedup.
from __future__ import annotations

from celery import shared_task

DRAIN_LOCK_TIMEOUT = 300


@shared_task(name="automation_engine.drain", time_limit=DRAIN_LOCK_TIMEOUT + 30, soft_time_limit=DRAIN_LOCK_TIMEOUT)
def _drain_task():
    from apps.core.automation_engine.drainer import drain

    drain()


def kick_drainer():
    """Plain function (not a task) so dispatch.py/scheduler.py/events.py can pass it straight to
    transaction.on_commit(...) -- calling a Celery task object directly would run it inline in
    the caller's process instead of enqueuing it, which is exactly what this needs to avoid."""
    _drain_task.delay()


@shared_task(name="automation_engine.process_cron")
def process_cron_task():
    from apps.core.automation_engine.scheduler import process_cron

    process_cron()


@shared_task(name="automation_engine.process_date_based")
def process_date_based_task():
    from apps.core.automation_engine.scheduler import process_date_based

    process_date_based()


@shared_task(name="automation_engine.drain_due")
def drain_due_task():
    """Scheduler safety net (requeue stale claims, then drain inline) -- run on the same beat
    tick as process_cron so a crashed drainer doesn't strand rows in Running forever."""
    from apps.core.automation_engine.drainer import drain_due

    drain_due()


@shared_task(name="automation_engine.purge_queue")
def purge_queue_task():
    from apps.core.automation_engine.drainer import purge_queue

    purge_queue()
