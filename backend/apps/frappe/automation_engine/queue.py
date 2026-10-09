import frappe
from frappe.utils import get_datetime, now_datetime

QUEUE = "Automation Trigger Queue"

DRAIN_QUEUE = "default"

WAITING_STATES = ("Pending", "Scheduled")

EFFECTS_TTL = 24 * 3600


def queue_status(run_after=None) -> str:
    """Resting status for a queue row with this run_after."""
    if run_after and get_datetime(run_after) > now_datetime():
        return "Scheduled"
    return "Pending"


def effects_key(row_name: str) -> str:
    return f"automation_effects::{row_name}"


def mark_effects_delivered(row_name: str):
    """Record, where a rollback cannot reach it, that this row has already acted outside the
    database - a webhook sent, a script that called out. The run may still fail afterwards, but
    re-running it from the top would repeat that call, so the mark outlives the transaction."""
    frappe.cache.set_value(effects_key(row_name), 1, expires_in_sec=EFFECTS_TTL)


def effects_delivered(row_name: str) -> bool:
    return bool(frappe.cache.get_value(effects_key(row_name), use_local_cache=False))


def clear_effects(row_name: str):
    frappe.cache.delete_value(effects_key(row_name))
