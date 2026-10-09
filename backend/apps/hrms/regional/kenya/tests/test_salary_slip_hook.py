from django.test import TestCase

import frappe
from apps.erpnext.regional.kenya.setup import setup as setup_kenya_company
from apps.frappe.runtime import new_doc, session
from apps.hrms.regional.kenya.setup import (
    EMPLOYEE_COMPONENTS,
    EMPLOYER_COMPONENTS,
    INPUT_COMPONENTS,
    setup,
)


class KenyaSalarySlipHookTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        frappe.flags.country_change = True
        company = new_doc("Company")
        company.company_name = "Kenya Payroll Ltd"
        company.abbr = "KPL"
        company.default_currency = "KES"
        company.country = "Kenya"
        company.chart_of_accounts = "Standard"
        company.insert()
        self.company = company.name
        setup_kenya_company(self.company)
        setup()

    def tearDown(self):
        frappe.flags.country_change = False
        frappe.local.flags.company = None

    def slip(self, gross_pay=100000):
        doc = new_doc("Salary Slip")
        doc.company = self.company
        doc.payroll_frequency = "Monthly"
        doc.start_date = "2026-06-01"
        doc.end_date = "2026-06-30"
        doc.gross_pay = gross_pay
        frappe.local.flags.company = self.company
        return doc

    def amounts(self, doc, table):
        return {row.salary_component: row.amount for row in doc.get(table)}

    def test_setup_creates_components_once(self):
        before = frappe.db.count("Salary Component")
        setup()
        self.assertEqual(frappe.db.count("Salary Component"), before)
        for component in [*EMPLOYEE_COMPONENTS.values(), *INPUT_COMPONENTS.values()]:
            self.assertEqual(frappe.db.get_value("Salary Component", component, "type"), "Deduction")
        for component in EMPLOYER_COMPONENTS.values():
            self.assertEqual(frappe.db.get_value("Salary Component", component, "type"), "Employer Contribution")

    def test_regional_override_adds_statutory_deductions(self):
        doc = self.slip(100000)
        doc.apply_regional_deductions()
        deductions = self.amounts(doc, "deductions")
        self.assertEqual(deductions["NSSF"], 6000)
        self.assertEqual(deductions["SHIF"], 2750)
        self.assertEqual(deductions["Housing Levy"], 1500)
        self.assertEqual(deductions["PAYE"], 19308.35)

    def test_regional_override_adds_employer_contributions(self):
        doc = self.slip(100000)
        doc.apply_regional_deductions()
        contributions = self.amounts(doc, "employer_contributions")
        self.assertEqual(contributions["NSSF Employer"], 6000)
        self.assertEqual(contributions["Housing Levy Employer"], 1500)
        self.assertEqual(contributions["NITA Levy"], 50)

    def test_structure_rows_take_precedence(self):
        doc = self.slip(100000)
        doc.append(
            "deductions",
            {"salary_component": "NSSF", "abbr": "NSSF", "amount": 1234, "default_amount": 1234},
        )
        doc.apply_regional_deductions()
        deductions = self.amounts(doc, "deductions")
        self.assertEqual(deductions["NSSF"], 1234)
        self.assertEqual(deductions["PAYE"], 19308.35)

    def test_input_components_reduce_paye(self):
        doc = self.slip(100000)
        doc.append(
            "deductions",
            {"salary_component": "Insurance Premium", "abbr": "INSP", "amount": 20000, "default_amount": 20000},
        )
        doc.apply_regional_deductions()
        self.assertEqual(self.amounts(doc, "deductions")["PAYE"], 16308.35)

    def test_other_countries_are_not_touched(self):
        company = new_doc("Company")
        company.company_name = "Kenya Neighbour Ltd"
        company.abbr = "KNL"
        company.default_currency = "UGX"
        company.country = "Uganda"
        company.chart_of_accounts = "Standard"
        company.insert()
        doc = self.slip(100000)
        doc.company = company.name
        frappe.local.flags.company = company.name
        doc.apply_regional_deductions()
        self.assertEqual(self.amounts(doc, "deductions"), {})
