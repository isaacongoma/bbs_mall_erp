import functools
import inspect

import frappe

__version__ = "17.0.0-dev"


def refetch_resource(cache_key: str | list, user=None):
    frappe.publish_realtime(
        "hrms:refetch_resource",
        {"cache_key": cache_key},
        user=user or frappe.session.user,
        after_commit=True,
    )


def get_region(company=None):
    if not company:
        company = frappe.local.flags.company
    if company:
        return frappe.get_cached_value("Company", company, "country")
    return frappe.flags.country or frappe.get_system_settings("country")


def allow_regional(fn):
    @functools.wraps(fn)
    def caller(*args, **kwargs):
        overrides = frappe.get_hooks("regional_overrides", {}).get(get_region())
        function_path = f"{inspect.getmodule(fn).__name__.removeprefix('apps.')}.{fn.__name__}"
        if not overrides or function_path not in overrides:
            return fn(*args, **kwargs)
        return frappe.get_attr(overrides[function_path][-1])(*args, **kwargs)

    return caller
