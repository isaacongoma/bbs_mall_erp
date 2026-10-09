import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

from erpnext.regional.kenya.data import (
    TAX_CATEGORIES,
    VAT_RATES,
    WITHHOLDING_CATEGORIES,
    WITHHOLDING_EFFECTIVE_FROM,
)


def setup(company=None, patch=True):
    make_custom_fields()
    make_tax_categories()
    make_withholding_categories()
    if company:
        make_vat_templates(company)
        make_withholding_accounts(company)


def make_custom_fields(update=True):
    kra_pin = dict(
        fieldname="kra_pin",
        label="KRA PIN",
        fieldtype="Data",
        length=11,
        insert_after="tax_id",
    )
    is_zero_rated = dict(
        fieldname="kenya_vat_treatment",
        label="Kenya VAT Treatment",
        fieldtype="Select",
        options="\nStandard\nZero Rated\nExempt\nFuel",
        default="Standard",
        insert_after="item_group",
    )
    from erpnext.erpnext_integrations.etims.fields import get_etims_custom_fields

    etims = get_etims_custom_fields()
    create_custom_fields(
        {
            "Customer": [kra_pin],
            "Supplier": [kra_pin],
            "Company": [kra_pin],
            "Item": [is_zero_rated, *etims["Item"]],
            "Sales Invoice": etims["Invoice"],
            "Purchase Invoice": [*etims["Invoice"], *etims["Purchase Invoice"]],
        },
        update=update,
    )


def make_tax_categories():
    for name in TAX_CATEGORIES:
        if not frappe.db.exists("Tax Category", name):
            frappe.get_doc({"doctype": "Tax Category", "title": name}).insert(ignore_permissions=True)


def make_withholding_categories():
    for name, rate, threshold in WITHHOLDING_CATEGORIES:
        if frappe.db.exists("Tax Withholding Category", name):
            continue
        frappe.get_doc(
            {
                "doctype": "Tax Withholding Category",
                "name": name,
                "category_name": name,
                "tax_deduction_basis": "Net Total",
                "rates": [
                    {
                        "from_date": WITHHOLDING_EFFECTIVE_FROM,
                        "to_date": "2099-12-31",
                        "tax_withholding_rate": rate,
                        "single_threshold": threshold,
                        "cumulative_threshold": 0,
                    }
                ],
                "accounts": [],
            }
        ).insert(ignore_permissions=True, ignore_mandatory=True)


def get_or_create_account(company, account_name, parent_account_name, account_type=None):
    abbr = frappe.get_cached_value("Company", company, "abbr")
    name = f"{account_name} - {abbr}"
    if frappe.db.exists("Account", name):
        return name
    parent = frappe.db.get_value("Account", {"company": company, "account_name": parent_account_name, "is_group": 1})
    if not parent:
        return None
    frappe.get_doc(
        {
            "doctype": "Account",
            "account_name": account_name,
            "company": company,
            "parent_account": parent,
            "account_type": account_type or "Tax",
            "is_group": 0,
        }
    ).insert(ignore_permissions=True)
    return name


def make_vat_templates(company):
    abbr = frappe.get_cached_value("Company", company, "abbr")
    output = get_or_create_account(company, "Output VAT", "Duties and Taxes")
    input_vat = get_or_create_account(company, "Input VAT", "Duties and Taxes")
    if not output or not input_vat:
        return
    for title, rate in VAT_RATES:
        for doctype, account in (
            ("Sales Taxes and Charges Template", output),
            ("Purchase Taxes and Charges Template", input_vat),
        ):
            name = f"{title} - {abbr}"
            if frappe.db.exists(doctype, name):
                continue
            frappe.get_doc(
                {
                    "doctype": doctype,
                    "title": title,
                    "company": company,
                    "taxes": [
                        {
                            "charge_type": "On Net Total",
                            "account_head": account,
                            "description": title,
                            "rate": rate,
                        }
                    ],
                }
            ).insert(ignore_permissions=True)


def make_withholding_accounts(company):
    account = get_or_create_account(company, "Withholding Tax Payable", "Duties and Taxes")
    if not account:
        return
    for name, rate, threshold in WITHHOLDING_CATEGORIES:
        if frappe.db.exists("Tax Withholding Account", {"parent": name, "company": company}):
            continue
        frappe.get_doc(
            {
                "doctype": "Tax Withholding Account",
                "parent": name,
                "parenttype": "Tax Withholding Category",
                "parentfield": "accounts",
                "company": company,
                "account": account,
            }
        ).insert(ignore_permissions=True)
