import frappe

from erpnext.tests.utils import ERPNextTestSuite


class TestAuthorizationControl(ERPNextTestSuite):
    def test_validate_approving_authority_raises_when_over_limit(self):
        if not frappe.db.exists("Role", "_Test Approver Role"):
            frappe.get_doc({"doctype": "Role", "role_name": "_Test Approver Role"}).insert()

        user = "_test_auth_control_user@example.com"
        if not frappe.db.exists("User", user):
            frappe.get_doc(
                {
                    "doctype": "User",
                    "email": user,
                    "first_name": "Auth Control",
                    "send_welcome_email": 0,
                    "roles": [{"role": "Sales User"}],
                }
            ).insert(ignore_permissions=True)

        frappe.get_doc(
            {
                "doctype": "Authorization Rule",
                "transaction": "Sales Order",
                "based_on": "Grand Total",
                "company": "_Test Company",
                "value": 1000,
                "approving_role": "_Test Approver Role",
            }
        ).insert()

        controller = frappe.get_cached_doc("Authorization Control")
        with self.set_user(user):
            self.assertRaises(
                frappe.ValidationError,
                controller.validate_approving_authority,
                "Sales Order",
                "_Test Company",
                5000,
            )

    def test_get_value_based_rule_runs(self):
        controller = frappe.get_cached_doc("Authorization Control")
        result = controller.get_value_based_rule("Expense Claim", "_NONEXISTENT-EMP", 100, "_Test Company")
        self.assertEqual(list(result), [])
