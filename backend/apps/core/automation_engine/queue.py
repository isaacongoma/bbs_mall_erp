# Ported from frappe/automation_engine/queue.py (frappe/frappe, MIT).
# frappe.cache -> Django's cache framework.
from django.core.cache import cache
from django.utils import timezone

WAITING_STATES = ("Pending", "Scheduled")
EFFECTS_TTL = 24 * 3600


def queue_status(run_after=None) -> str:
    if run_after and run_after > timezone.now():
        return "Scheduled"
    return "Pending"


def effects_key(row_name: str) -> str:
    return f"automation_effects::{row_name}"


def mark_effects_delivered(row_name: str):
    """Record that this row has already acted outside the database (a webhook sent, a script
    that called out) before a rollback could reach it -- re-running the row from the top would
    repeat that call, so the mark outlives the transaction."""
    cache.set(effects_key(row_name), True, EFFECTS_TTL)


def effects_delivered(row_name: str) -> bool:
    return bool(cache.get(effects_key(row_name)))


def clear_effects(row_name: str):
    cache.delete(effects_key(row_name))
