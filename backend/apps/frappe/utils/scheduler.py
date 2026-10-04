import frappe


def is_scheduler_inactive(verbose=True) -> bool:
    return bool(frappe.conf.get("pause_scheduler")) or bool(frappe.flags.get("pause_scheduler"))


def is_scheduler_disabled(verbose=True) -> bool:
    return is_scheduler_inactive(verbose)
