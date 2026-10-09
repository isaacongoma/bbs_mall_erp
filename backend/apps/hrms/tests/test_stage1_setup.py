from django.test import TestCase

from apps.erpnext.registry import get_controller, get_meta, get_model, list_doctypes
from apps.frappe import exceptions, new_doc
from apps.frappe.runtime import SKIPPED_UNREGISTERED_HOOK_DOCTYPES, get_hooks


class HrmsStage1SetupTests(TestCase):
    def test_stage1_doctypes_are_registered(self):
        for doctype in (
            "HR Settings",
            "Employment Type",
            "Employee Grade",
            "Designation Skill",
            "Leave Type",
            "Holiday List Assignment",
            "Shift Type",
            "Identification Document Type",
            "Interest",
        ):
            self.assertIn(doctype, list_doctypes())
            self.assertEqual(get_meta(doctype)["name"], doctype)

    def test_stage1_models_resolve_for_table_doctypes(self):
        self.assertEqual(get_model("Employment Type")._meta.db_table, "tabEmployment Type")
        self.assertEqual(get_model("Shift Type")._meta.db_table, "tabShift Type")
        self.assertEqual(get_model("Designation Skill")._meta.db_table, "tabDesignation Skill")

    def test_hr_settings_is_single_controller_without_table_model(self):
        self.assertEqual(get_controller("HR Settings").doctype, "HR Settings")
        with self.assertRaises(LookupError):
            get_model("HR Settings")

    def test_hrms_hooks_are_merged(self):
        self.assertIn("Employee", get_hooks("override_doctype_class"))
        self.assertIn("daily_long", get_hooks("scheduler_events"))
        self.assertIn("Expense Claim", get_hooks("invoice_doctypes"))
        self.assertNotIn(("invoice_doctypes", "Expense Claim"), SKIPPED_UNREGISTERED_HOOK_DOCTYPES)

    def test_leave_type_compensatory_and_earned_leave_are_mutually_exclusive(self):
        doc = new_doc("Leave Type")
        doc.leave_type_name = "Mixed Leave"
        doc.is_compensatory = 1
        doc.is_earned_leave = 1
        with self.assertRaises(exceptions.ValidationError):
            doc.validate()

    def test_leave_type_partial_pay_fraction_bounds(self):
        doc = new_doc("Leave Type")
        doc.leave_type_name = "Partial Pay Leave"
        doc.is_ppl = 1
        doc.fraction_of_daily_salary_per_leave = 2
        with self.assertRaises(exceptions.ValidationError):
            doc.validate()
