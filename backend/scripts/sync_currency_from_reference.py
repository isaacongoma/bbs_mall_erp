import json
import os

import frappe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FIELDS = ("enabled", "fraction", "fraction_units", "smallest_currency_fraction_value", "symbol", "symbol_on_right", "number_format")


def run():
    with open(os.path.join(ROOT, "docs", "reference", "erpnext_cloud_currency.json"), encoding="utf8") as handle:
        rows = json.load(handle)
    updated = 0
    for row in rows:
        if not frappe.db.exists("Currency", row["name"]):
            continue
        for field in FIELDS:
            value = row.get(field)
            if value is not None:
                frappe.db.set_value("Currency", row["name"], field, value, update_modified=False)
        updated += 1
    frappe.db.commit()
    frappe.clear_cache()
    return updated
