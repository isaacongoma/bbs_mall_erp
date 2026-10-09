import frappe
from apps.erpnext.geo.doctype.currency.currency import DEFAULT_ENABLED_CURRENCIES, Currency, enable_default_currencies

__all__ = ["DEFAULT_ENABLED_CURRENCIES", "Currency", "enable_default_currencies"]


def enable_default_currencies():
    frappe.db.set_value("Currency", {"name": ("in", DEFAULT_ENABLED_CURRENCIES)}, "enabled", 1)
