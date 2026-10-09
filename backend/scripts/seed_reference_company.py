import json

import frappe

COMPANY_KEEP = (
    "company_name",
    "abbr",
    "default_currency",
    "country",
    "reporting_currency",
    "create_chart_of_accounts_based_on",
    "chart_of_accounts",
    "enable_perpetual_inventory",
    "valuation_method",
    "reconciliation_takes_effect_on",
    "auto_err_frequency",
)
ACCOUNT_KEEP = (
    "account_name",
    "account_number",
    "parent_account",
    "root_type",
    "report_type",
    "account_type",
    "is_group",
    "company",
    "account_currency",
    "tax_rate",
    "freeze_account",
    "balance_must_be",
)
SKIP_COMPANY_DEFAULTS = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "doctype", "lft", "rgt", "old_parent", "parent_company"}


def insert(doctype, values, **flags):
    doc = frappe.get_doc({"doctype": doctype, **values})
    for key, value in flags.items():
        doc.flags[key] = value
    doc.insert(ignore_permissions=True, ignore_if_duplicate=True)
    return doc


def run(path):
    with open(path, encoding="utf8") as handle:
        data = json.load(handle)
    company = data["Company"][0]
    name = company["name"]
    report = {}
    if not frappe.db.exists("Company", name):
        frappe.local.flags.ignore_chart_of_accounts = True
        try:
            insert("Company", {key: company.get(key) for key in COMPANY_KEEP if company.get(key) is not None})
        finally:
            frappe.local.flags.ignore_chart_of_accounts = False
        frappe.db.commit()
    frappe.db.delete("Account", {"company": name})
    pending = {row["name"]: row for row in data["Account"]}
    accounts = []
    seen = set()
    while pending:
        ready = [row for row in pending.values() if not row.get("parent_account") or row["parent_account"] in seen]
        if not ready:
            raise RuntimeError(f"orphan accounts: {list(pending)[:5]}")
        for row in sorted(ready, key=lambda item: item.get("lft") or 0):
            accounts.append(row)
            seen.add(row["name"])
            del pending[row["name"]]
    created = 0
    for row in accounts:
        if frappe.db.exists("Account", row["name"]):
            continue
        values = {key: row.get(key) for key in ACCOUNT_KEEP if row.get(key) not in (None, "")}
        insert("Account", values, ignore_mandatory=True)
        created += 1
    for row in data["Account"]:
        values = {key: row.get(key) for key in ("is_group", "account_type", "root_type", "report_type", "tax_rate", "account_currency", "freeze_account", "balance_must_be", "account_category", "disabled") if row.get(key) is not None}
        frappe.db.set_value("Account", row["name"], values, update_modified=False)
    frappe.db.commit()
    report["accounts_created"] = created
    for key, value in company.items():
        if key in SKIP_COMPANY_DEFAULTS or key in COMPANY_KEEP or value in (None, "") or isinstance(value, list):
            continue
        meta_field = frappe.get_meta("Company").get_field(key)
        if meta_field and meta_field.fieldtype in ("Link", "Select", "Check", "Data", "Int", "Float", "Currency"):
            frappe.db.set_value("Company", name, key, value, update_modified=False)
    frappe.db.commit()
    for row in data["Fiscal Year"]:
        if not frappe.db.exists("Fiscal Year", row["name"]):
            insert("Fiscal Year", {k: row.get(k) for k in ("year", "year_start_date", "year_end_date", "disabled", "is_short_year") if row.get(k) is not None})
    frappe.db.commit()
    for row in sorted(data["Cost Center"], key=lambda item: item.get("lft") or 0):
        if not frappe.db.exists("Cost Center", row["name"]):
            values = {k: row.get(k) for k in ("cost_center_name", "parent_cost_center", "company", "is_group", "cost_center_number", "disabled") if row.get(k) not in (None, "")}
            insert("Cost Center", values, ignore_mandatory=True)
    frappe.db.commit()
    for doctype in ("Sales Taxes and Charges Template", "Purchase Taxes and Charges Template", "Item Tax Template"):
        for row in data.get(doctype, []):
            if frappe.db.exists(doctype, row["name"]):
                continue
            payload = {k: v for k, v in row.items() if k not in ("owner", "creation", "modified", "modified_by", "idx", "docstatus")}
            for child in payload.values():
                if isinstance(child, list):
                    for entry in child:
                        for key in ("owner", "creation", "modified", "modified_by", "name", "idx", "parent", "parentfield", "parenttype"):
                            entry.pop(key, None)
            payload.pop("name", None)
            doc = frappe.get_doc(payload)
            doc.flags.ignore_links = True
            doc.flags.ignore_mandatory = True
            doc.flags.ignore_validate = True
            doc.insert(ignore_permissions=True, ignore_mandatory=True)
    frappe.db.commit()
    report["accounts"] = frappe.db.count("Account", {"company": name})
    report["cost_centers"] = frappe.db.count("Cost Center", {"company": name})
    return report
