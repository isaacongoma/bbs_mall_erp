# Thread-local run-state, standing in for frappe.flags (a request/thread-local dict in real
# Frappe). Read by dispatch.py (recursion depth), runner.py (execution identity / trial mode)
# and actions/core.py (RunScript's author-permission gate).
import threading

_local = threading.local()


def get_depth() -> int:
    return getattr(_local, "automation_depth", 0)


def set_depth(value: int):
    _local.automation_depth = value


def in_automation_run() -> bool:
    return getattr(_local, "in_automation_run", False)


def set_in_automation_run(value: bool):
    _local.in_automation_run = value


def in_automation_trial() -> bool:
    return getattr(_local, "in_automation_trial", False)


def set_in_automation_trial(value: bool):
    _local.in_automation_trial = value


def branch_overrides() -> dict:
    return getattr(_local, "automation_branch_overrides", None) or {}


def set_branch_overrides(value: dict | None):
    _local.automation_branch_overrides = value
