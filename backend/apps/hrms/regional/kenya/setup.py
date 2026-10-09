import frappe

EMPLOYEE_COMPONENTS = {
    "paye": "PAYE",
    "nssf": "NSSF",
    "shif": "SHIF",
    "housing_levy": "Housing Levy",
}

EMPLOYER_COMPONENTS = {
    "employer_nssf": "NSSF Employer",
    "employer_housing_levy": "Housing Levy Employer",
    "employer_nita": "NITA Levy",
}

INPUT_COMPONENTS = {
    "pension": "Pension Contribution",
    "mortgage_interest": "Mortgage Interest",
    "insurance_premium": "Insurance Premium",
}

ABBREVIATIONS = {
    "PAYE": "PAYE",
    "NSSF": "NSSF",
    "SHIF": "SHIF",
    "Housing Levy": "AHL",
    "NSSF Employer": "NSSFER",
    "Housing Levy Employer": "AHLER",
    "NITA Levy": "NITA",
    "Pension Contribution": "PENS",
    "Mortgage Interest": "MORT",
    "Insurance Premium": "INSP",
}


def component_values(name, component_type, **extra):
    values = {
        "doctype": "Salary Component",
        "salary_component": name,
        "salary_component_abbr": ABBREVIATIONS[name],
        "type": component_type,
        "depends_on_payment_days": 0,
        "is_tax_applicable": 0,
        "amount_based_on_formula": 0,
    }
    values.update(extra)
    return values


def setup():
    if not frappe.db.table_exists("Salary Component"):
        return
    wanted = [component_values(name, "Deduction") for name in EMPLOYEE_COMPONENTS.values()]
    wanted += [component_values(name, "Deduction", do_not_include_in_total=1) for name in INPUT_COMPONENTS.values()]
    for name in EMPLOYER_COMPONENTS.values():
        wanted.append(component_values(name, "Employer Contribution"))
    for values in wanted:
        if frappe.db.exists("Salary Component", values["salary_component"]):
            continue
        frappe.get_doc(values).insert(ignore_permissions=True)
