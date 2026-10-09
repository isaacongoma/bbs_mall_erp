import frappe
from frappe.utils import flt, getdate

from apps.hrms.regional.kenya import payroll
from apps.hrms.regional.kenya.setup import (
    EMPLOYEE_COMPONENTS,
    EMPLOYER_COMPONENTS,
    INPUT_COMPONENTS,
)


def set_company_region(doc, method=None):
    if doc.company:
        frappe.local.flags.company = doc.company


def structure_components(doc, table):
    return {row.salary_component for row in doc.get(table) or [] if row.salary_component}


def component_amount(doc, table, component):
    return sum(flt(row.amount) for row in doc.get(table) or [] if row.salary_component == component)


def set_row(doc, table, component, amount):
    existing = next((row for row in doc.get(table) or [] if row.salary_component == component), None)
    if existing:
        existing.amount = amount
        existing.default_amount = amount
        return
    abbr = frappe.db.get_value("Salary Component", component, "salary_component_abbr")
    doc.append(
        table,
        {
            "salary_component": component,
            "abbr": abbr,
            "amount": amount,
            "default_amount": amount,
        },
    )


def apply_regional_deductions(doc):
    if not frappe.db.exists("Salary Component", EMPLOYEE_COMPONENTS["paye"]):
        return

    already_in_structure = structure_components(doc, "deductions")
    result = payroll.compute_for_period(
        flt(doc.gross_pay),
        doc.payroll_frequency or "Monthly",
        on_date=getdate(doc.end_date) if doc.end_date else None,
        pension_contribution=component_amount(doc, "deductions", INPUT_COMPONENTS["pension"]),
        mortgage_interest=component_amount(doc, "deductions", INPUT_COMPONENTS["mortgage_interest"]),
        insurance_premiums=component_amount(doc, "deductions", INPUT_COMPONENTS["insurance_premium"]),
    )

    for key, component in EMPLOYEE_COMPONENTS.items():
        if component in already_in_structure:
            continue
        set_row(doc, "deductions", component, flt(result[key]))

    if doc.meta.has_field("employer_contributions"):
        for key, component in EMPLOYER_COMPONENTS.items():
            if component in structure_components(doc, "employer_contributions"):
                continue
            set_row(doc, "employer_contributions", component, flt(result[key]))
