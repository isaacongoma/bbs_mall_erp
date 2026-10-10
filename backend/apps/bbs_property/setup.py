import json
import secrets

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

ROLES = {
    "Property Manager": {"desk_access": 1},
    "Leasing Officer": {"desk_access": 1},
    "Property Accountant": {"desk_access": 1},
    "Tenant": {"desk_access": 0, "two_factor_auth": 0},
}

ITEMS = {
    "rent_item": ("Rent", "Commercial space rent"),
    "service_charge_item": ("Service Charge", "Service charge on leased space"),
    "turnover_rent_item": ("Turnover Rent", "Turnover based rent top-up"),
    "late_fee_item": ("Late Payment Fee", "Penalty on overdue rent"),
    "maintenance_charge_item": ("Maintenance Recharge", "Maintenance work recharged to tenant"),
}
UTILITY_ITEMS = ("Electricity", "Water", "Parking")


def custom_fields():
    return {
        "Sales Invoice": [
            {
                "fieldname": "lease_section",
                "fieldtype": "Section Break",
                "label": "Lease",
                "insert_after": "more_info_tab",
                "collapsible": 1,
            },
            {"fieldname": "is_lease_invoice", "fieldtype": "Check", "label": "Lease Invoice", "insert_after": "lease_section", "read_only": 1, "no_copy": 1, "search_index": 1},
            {"fieldname": "lease", "fieldtype": "Link", "label": "Lease", "options": "Lease Agreement", "insert_after": "is_lease_invoice", "read_only": 1, "no_copy": 1, "search_index": 1},
            {"fieldname": "property", "fieldtype": "Link", "label": "Property", "options": "Property", "insert_after": "lease", "read_only": 1, "no_copy": 1},
            {"fieldname": "lease_column", "fieldtype": "Column Break", "insert_after": "property"},
            {"fieldname": "billing_period_start", "fieldtype": "Date", "label": "Billing Period Start", "insert_after": "lease_column", "read_only": 1, "no_copy": 1},
            {"fieldname": "billing_period_end", "fieldtype": "Date", "label": "Billing Period End", "insert_after": "billing_period_start", "read_only": 1, "no_copy": 1},
            {"fieldname": "late_fee_for", "fieldtype": "Link", "label": "Late Fee For", "options": "Sales Invoice", "insert_after": "billing_period_end", "read_only": 1, "no_copy": 1},
            {"fieldname": "late_fee_period", "fieldtype": "Int", "label": "Late Fee Month", "insert_after": "late_fee_for", "read_only": 1, "no_copy": 1},
        ],
        "Customer": [
            {"fieldname": "tenant_section", "fieldtype": "Section Break", "label": "Tenant", "insert_after": "tax_id", "collapsible": 1},
            {"fieldname": "is_tenant", "fieldtype": "Check", "label": "Is Tenant", "insert_after": "tenant_section", "in_standard_filter": 1},
            {"fieldname": "tenant_portal_users", "fieldtype": "Table", "label": "Tenant Portal Users", "options": "Tenant Portal User", "insert_after": "is_tenant", "depends_on": "is_tenant"},
        ],
    }


def ensure_roles():
    for name, values in ROLES.items():
        if not frappe.db.exists("Role", name):
            frappe.get_doc({"doctype": "Role", "role_name": name, **values}).insert(ignore_permissions=True)


def item_group():
    for name in ("Services", "All Item Groups"):
        if frappe.db.exists("Item Group", name):
            return name
    return frappe.db.get_value("Item Group", {"is_group": 0})


def ensure_item(code, description):
    if frappe.db.exists("Item", code):
        return code
    frappe.get_doc(
        {
            "doctype": "Item",
            "item_code": code,
            "item_name": code,
            "item_group": item_group(),
            "stock_uom": "Nos",
            "is_stock_item": 0,
            "is_sales_item": 1,
            "is_purchase_item": 0,
            "include_item_in_manufacturing": 0,
            "description": description,
        }
    ).insert(ignore_permissions=True)
    return code


def ensure_settings():
    settings = frappe.get_single("Property Settings")
    changed = False
    for field, (code, description) in ITEMS.items():
        if not settings.get(field):
            settings.set(field, ensure_item(code, description))
            changed = True
    for code in UTILITY_ITEMS:
        ensure_item(code, f"{code} charges")
    if not settings.get_password("mpesa_callback_token", raise_exception=False):
        settings.mpesa_callback_token = secrets.token_urlsafe(24)
        changed = True
    if not settings.default_company:
        company = frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {})
        if company:
            settings.default_company = company
            changed = True
    if changed:
        settings.save(ignore_permissions=True)


def register_app():
    installed = json.loads(frappe.db.get_global("installed_apps") or "[]")
    if "bbs_property" not in installed:
        installed.append("bbs_property")
        frappe.db.set_global("installed_apps", json.dumps(installed))


def after_install():
    ensure_roles()
    create_custom_fields(custom_fields(), ignore_validate=True)
    ensure_settings()
    register_app()


def after_migrate():
    ensure_roles()
    create_custom_fields(custom_fields(), ignore_validate=True)
