# Ported from frappe/automation_engine/registry.py (frappe/frappe, MIT).
# frappe.client_cache -> Django's cache framework (see CACHES in config/settings/base.py).
from django.core.cache import cache

REGISTRY_KEY = "automations::{}"
EVENTS_KEY = "automations::_events"
CACHE_TTL = 300

DOC_TRIGGER_TYPES = (
    "Doc Created", "Doc Updated", "Field Value Changed", "Doc Deleted", "Doc Submitted", "Doc Cancelled",
)

RULE_FIELDS = (
    "name", "trigger_type", "trigger_field", "from_value", "to_value",
    "filters", "condition", "revalidate_on_run", "stop_on_error", "document_type",
)


def _cache_key(doctype: str) -> str:
    # Doctype labels contain spaces ("CRM Lead") -- memcached rejects those in a key, and
    # Django's cache framework only warns rather than sanitizing them itself.
    return REGISTRY_KEY.format(doctype.replace(" ", "_"))


def get_automations_for(doctype: str) -> list:
    """Return enabled doc-triggered automations for `doctype` (cached per doctype)."""
    key = _cache_key(doctype)
    value = cache.get(key)
    if value is None:
        value = _build_automations_for(doctype)
        cache.set(key, value, CACHE_TTL)
    return value


def _build_automations_for(doctype: str) -> list:
    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow

    rows = AutomationFlow.objects.filter(
        enabled=True, document_type=doctype, trigger_type__in=DOC_TRIGGER_TYPES
    ).values(*RULE_FIELDS)
    return list(rows)


def get_custom_event_map() -> dict:
    value = cache.get(EVENTS_KEY)
    if value is None:
        value = _build_custom_event_map()
        cache.set(EVENTS_KEY, value, CACHE_TTL)
    return value


def _build_custom_event_map() -> dict:
    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow

    rows = AutomationFlow.objects.filter(enabled=True, trigger_type="Custom Event").values(
        *RULE_FIELDS, "custom_event"
    )
    event_map: dict = {}
    for rule in rows:
        event_map.setdefault(rule["custom_event"], []).append(rule)
    return event_map


def clear_automation_cache(doctype: str | None = None):
    if doctype:
        cache.delete(_cache_key(doctype))
        cache.delete(EVENTS_KEY)
    else:
        cache.delete(EVENTS_KEY)
