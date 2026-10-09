import frappe
from frappe.utils import get_first_day, get_last_day, nowdate

from erpnext.setup.doctype.employee.test_employee import make_employee

from hrms.payroll.doctype.salary_structure.test_salary_structure import make_salary_structure
from hrms.tests.utils import HRMSTestSuite


def _make_component(name, abbr, comp_type="Earning", **flags):
    if frappe.db.exists("Salary Component", name):
        frappe.delete_doc("Salary Component", name, force=True)
    doc = frappe.new_doc("Salary Component")
    doc.update({"salary_component": name, "salary_component_abbr": abbr, "type": comp_type})
    doc.update(flags)
    return doc.insert()


def _make_slip_custom_field(fieldname, fieldtype="Float", default=None):
    if frappe.db.exists("Custom Field", {"dt": "Salary Slip", "fieldname": fieldname}):
        return
    return frappe.get_doc(
        doctype="Custom Field",
        dt="Salary Slip",
        fieldname=fieldname,
        label=fieldname.replace("_", " ").title(),
        fieldtype=fieldtype,
        default=default,
        insert_after="net_pay",
    ).insert()


class TestSalaryStructureAssignment(HRMSTestSuite):
    def test_ctc_and_annual_gross_exclude_statistical_and_include_employer(self):
        emp = make_employee("ssa_ctc_calc@test.com", company="_Test Company")

        _make_component("SSA Test Basic", "SSATB", "Earning", amount_based_on_formula=1, formula="base")
        _make_component("SSA Test Statistical", "SSATS", "Earning", statistical_component=1)
        _make_component("SSA Test Employer PF", "SSATEPF", "Employer Contribution")

        earnings = [
            {
                "salary_component": "SSA Test Basic",
                "abbr": "SSATB",
                "amount_based_on_formula": 1,
                "formula": "base",
            },
            {
                "salary_component": "SSA Test Statistical",
                "abbr": "SSATS",
                "statistical_component": 1,
                "amount": 1000,
            },
        ]
        employer_contributions = [
            {"salary_component": "SSA Test Employer PF", "abbr": "SSATEPF", "amount": 6000},
        ]

        make_salary_structure(
            "SSA Test CTC Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=50000,
            earnings=earnings,
            deductions=[],
            other_details={"employer_contributions": employer_contributions},
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        self.assertEqual(ssa.annual_gross_earning, 50000 * 12)
        self.assertEqual(ssa.ctc, (50000 + 6000) * 12)

    def test_ctc_reset_when_base_missing(self):
        emp = make_employee("ssa_ctc_nobase@test.com", company="_Test Company")
        make_salary_structure("SSA Test No Base Structure", "Monthly", company="_Test Company")
        ssa = frappe.new_doc("Salary Structure Assignment")
        ssa.employee = emp
        ssa.salary_structure = "SSA Test No Base Structure"
        ssa.company = "_Test Company"
        ssa.from_date = get_first_day(nowdate())
        ssa.base = 0
        ssa.calculate_ctc_and_gross()
        self.assertEqual(ssa.ctc, 0)
        self.assertEqual(ssa.annual_gross_earning, 0)

    def test_get_evaluated_components_does_not_mutate_cached_structure(self):
        emp = make_employee("ssa_cache@test.com", company="_Test Company")
        make_salary_structure(
            "SSA Test Cache Structure", "Monthly", employee=emp, company="_Test Company", base=50000
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        ssa.get_evaluated_components()
        cached = frappe.get_cached_doc("Salary Structure", "SSA Test Cache Structure")
        self.assertTrue(all(not r.get("default_amount") for r in cached.earnings))

    def test_get_evaluated_components_resolves_salary_slip_fields(self):
        emp = make_employee("ssa_slip_field@test.com", company="_Test Company")

        formula = "base * getdate(start_date).month"
        _make_component(
            "SSA Test Period Bonus", "SSATPB", "Earning", amount_based_on_formula=1, formula=formula
        )
        earnings = [
            {
                "salary_component": "SSA Test Period Bonus",
                "abbr": "SSATPB",
                "amount_based_on_formula": 1,
                "formula": formula,
            },
        ]

        make_salary_structure(
            "SSA Test Slip Field Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=1000,
            earnings=earnings,
            deductions=[],
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        expected = 1000 * get_first_day(ssa.from_date).month
        components = {r.salary_component: r.default_amount for r in ssa.get_evaluated_components().earnings}
        self.assertEqual(components["SSA Test Period Bonus"], expected)

    def test_get_evaluated_components_resolves_uncovered_slip_fields(self):
        emp = make_employee("ssa_uncovered_field@test.com", company="_Test Company")

        condition = "gross_year_to_date < 74600"
        formula = "base + gross_year_to_date + month_to_date + year_to_date + unmarked_days"
        _make_component(
            "SSA Test Basic YTD", "SSATBYTD", "Earning", amount_based_on_formula=1, formula="base"
        )
        _make_component(
            "SSA Test YTD Guard", "SSATYG", "Deduction", amount_based_on_formula=1, formula=formula
        )

        earnings = [
            {
                "salary_component": "SSA Test Basic YTD",
                "abbr": "SSATBYTD",
                "amount_based_on_formula": 1,
                "formula": "base",
            },
        ]
        deductions = [
            {
                "salary_component": "SSA Test YTD Guard",
                "abbr": "SSATYG",
                "amount_based_on_formula": 1,
                "formula": formula,
                "condition": condition,
            },
        ]

        make_salary_structure(
            "SSA Test Uncovered Field Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=50000,
            earnings=earnings,
            deductions=deductions,
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        components = {r.salary_component: r.default_amount for r in ssa.get_evaluated_components().deductions}
        self.assertEqual(components["SSA Test YTD Guard"], 50000)

    def test_get_evaluated_components_resolves_salary_slip_custom_field(self):
        emp = make_employee("ssa_custom_field@test.com", company="_Test Company")
        _make_slip_custom_field("custom_shift_allowance_rate")

        formula = "base + custom_shift_allowance_rate"
        _make_component(
            "SSA Test Shift Allowance", "SSATSA", "Earning", amount_based_on_formula=1, formula=formula
        )
        earnings = [
            {
                "salary_component": "SSA Test Shift Allowance",
                "abbr": "SSATSA",
                "amount_based_on_formula": 1,
                "formula": formula,
            },
        ]

        make_salary_structure(
            "SSA Test Custom Field Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=50000,
            earnings=earnings,
            deductions=[],
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        components = {r.salary_component: r.default_amount for r in ssa.get_evaluated_components().earnings}
        self.assertEqual(components["SSA Test Shift Allowance"], 50000)

    def test_get_evaluated_components_uses_declared_field_defaults(self):
        emp = make_employee("ssa_field_default@test.com", company="_Test Company")
        _make_slip_custom_field("custom_shift_multiplier", fieldtype="Float", default="2")

        formula = "base * exchange_rate * custom_shift_multiplier"
        _make_component(
            "SSA Test Shift Multiplier", "SSATSM", "Earning", amount_based_on_formula=1, formula=formula
        )
        earnings = [
            {
                "salary_component": "SSA Test Shift Multiplier",
                "abbr": "SSATSM",
                "amount_based_on_formula": 1,
                "formula": formula,
            },
        ]

        make_salary_structure(
            "SSA Test Field Default Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=1000,
            earnings=earnings,
            deductions=[],
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        components = {r.salary_component: r.default_amount for r in ssa.get_evaluated_components().earnings}
        self.assertEqual(components["SSA Test Shift Multiplier"], 2000)

    def test_get_evaluated_components_seeds_posting_date(self):
        emp = make_employee("ssa_posting_date@test.com", company="_Test Company")

        formula = "base * getdate(posting_date).day"
        _make_component(
            "SSA Test Posting Bonus", "SSATPOB", "Earning", amount_based_on_formula=1, formula=formula
        )
        earnings = [
            {
                "salary_component": "SSA Test Posting Bonus",
                "abbr": "SSATPOB",
                "amount_based_on_formula": 1,
                "formula": formula,
            },
        ]

        make_salary_structure(
            "SSA Test Posting Date Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=1000,
            earnings=earnings,
            deductions=[],
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        expected = 1000 * get_last_day(ssa.from_date).day
        components = {r.salary_component: r.default_amount for r in ssa.get_evaluated_components().earnings}
        self.assertEqual(components["SSA Test Posting Bonus"], expected)

    def test_do_not_include_in_total_earning_is_in_ctc_but_not_gross(self):
        emp = make_employee("ssa_dniit@test.com", company="_Test Company")

        _make_component("SSA Test Basic Pay", "SSATBP", "Earning", amount_based_on_formula=1, formula="base")
        _make_component("SSA Test Company Car", "SSATCAR", "Earning", do_not_include_in_total=1)

        earnings = [
            {
                "salary_component": "SSA Test Basic Pay",
                "abbr": "SSATBP",
                "amount_based_on_formula": 1,
                "formula": "base",
            },
            {
                "salary_component": "SSA Test Company Car",
                "abbr": "SSATCAR",
                "amount": 2000,
                "do_not_include_in_total": 1,
            },
        ]

        make_salary_structure(
            "SSA Test DNIIT Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=50000,
            earnings=earnings,
            deductions=[],
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        self.assertEqual(ssa.annual_gross_earning, 50000 * 12)
        self.assertEqual(ssa.ctc, (50000 + 2000) * 12)

    def test_ctc_for_timesheet_structure_evaluates_base_driven_components(self):
        emp = make_employee("ssa_ts_ctc@test.com", company="_Test Company")

        _make_component("SSA TS Wage", "SSATSW", "Earning")
        _make_component("SSA TS Basic", "SSATSB", "Earning", amount_based_on_formula=1, formula="base")

        earnings = [
            {
                "salary_component": "SSA TS Basic",
                "abbr": "SSATSB",
                "amount_based_on_formula": 1,
                "formula": "base",
            },
        ]

        make_salary_structure(
            "SSA Timesheet Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=50000,
            earnings=earnings,
            deductions=[],
            other_details={
                "salary_slip_based_on_timesheet": 1,
                "hour_rate": 50,
                "salary_component": "SSA TS Wage",
            },
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        self.assertEqual(ssa.annual_gross_earning, 50000 * 12)
        self.assertEqual(ssa.ctc, 50000 * 12)

    def test_get_evaluated_components_excludes_timesheet_wage(self):
        emp = make_employee("ssa_ts_eval@test.com", company="_Test Company")

        _make_component("SSA TS2 Wage", "SSATS2W", "Earning")
        _make_component("SSA TS2 Basic", "SSATS2B", "Earning", amount_based_on_formula=1, formula="base")

        earnings = [
            {
                "salary_component": "SSA TS2 Basic",
                "abbr": "SSATS2B",
                "amount_based_on_formula": 1,
                "formula": "base",
            },
        ]

        make_salary_structure(
            "SSA Timesheet Eval Structure",
            "Monthly",
            employee=emp,
            company="_Test Company",
            base=50000,
            earnings=earnings,
            deductions=[],
            other_details={
                "salary_slip_based_on_timesheet": 1,
                "hour_rate": 50,
                "salary_component": "SSA TS2 Wage",
            },
        )
        ssa = frappe.get_last_doc("Salary Structure Assignment", filters={"employee": emp})

        components = [r.salary_component for r in ssa.get_evaluated_components().earnings]
        self.assertNotIn("SSA TS2 Wage", components)
        self.assertIn("SSA TS2 Basic", components)
