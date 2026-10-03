# Ported from frappe/automation_engine/settings.py (frappe/frappe, MIT).
import threading
from contextlib import contextmanager

from django.conf import settings as django_settings

_local = threading.local()

DEFAULTS = {
    "disable_automations": False,
    "max_depth": 3,
    "failure_threshold": 10,
    "stale_running_minutes": 30,
    "max_attempts": 3,
    "drain_seconds": 0,
    "commit_every": 50,
    "queue_retention_days": 7,
    "step_output_limit": 65536,
    "event_payload_limit": 65536,
    "allow_unregistered_events": False,
}

# Zero/False is meaningful for these; everywhere else it reads as "unset" and the default applies.
ZERO_IS_MEANINGFUL = frozenset({"disable_automations", "drain_seconds", "allow_unregistered_events"})



def settings_doc():
    from apps.core.doctype.automation_settings.automation_settings import AutomationSettings

    return AutomationSettings.get_solo()


def get(fieldname: str):
    value = getattr(settings_doc(), fieldname, None)
    if value in (None, "") or (not value and fieldname not in ZERO_IS_MEANINGFUL):
        return DEFAULTS[fieldname]
    return value


def is_enabled() -> bool:
    if getattr(_local, "skip_automations", False):
        return False
    if getattr(django_settings, "AUTOMATION_DISABLED", False):
        return False
    return not get("disable_automations")


@contextmanager
def skip_automations():
    previous = getattr(_local, "skip_automations", False)
    _local.skip_automations = True
    try:
        yield
    finally:
        _local.skip_automations = previous
