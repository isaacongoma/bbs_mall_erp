from django.test import TestCase

import frappe
from hrms import setup as hrms_setup
from hrms.install import after_install


class HrmsInstallStepTests(TestCase):
    def setUp(self):
        frappe.set_user("Administrator")

    def run_steps(self, names):
        for name in names:
            getattr(hrms_setup, name)()

    def test_custom_fields_and_fixtures(self):
        hrms_setup.create_custom_fields(hrms_setup.get_custom_fields(), ignore_validate=True)
        hrms_setup.create_salary_slip_loan_fields()
        hrms_setup.make_fixtures()
        hrms_setup.setup_notifications()
        hrms_setup.update_hr_defaults()
        missing = []
        for doctype, fields in hrms_setup.get_custom_fields().items():
            for field in fields:
                if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": field["fieldname"]}):
                    missing.append((doctype, field["fieldname"]))
        self.assertEqual(missing, [])

    def test_steps_are_idempotent(self):
        steps = ("create_salary_slip_loan_fields", "make_fixtures", "update_hr_defaults")
        hrms_setup.create_custom_fields(hrms_setup.get_custom_fields(), ignore_validate=True)
        self.run_steps(steps)
        count = frappe.db.count("Custom Field")
        self.run_steps(steps)
        self.assertEqual(frappe.db.count("Custom Field"), count)

    def test_post_install_steps(self):
        self.run_steps(
            (
                "set_single_defaults",
                "setup_repost_defaults",
                "create_default_role_profiles",
                "run_post_install_patches",
                "add_default_hr_permissions",
            )
        )


class HrmsFullInstallTests(TestCase):
    def setUp(self):
        frappe.set_user("Administrator")

    def test_after_install(self):
        after_install()
