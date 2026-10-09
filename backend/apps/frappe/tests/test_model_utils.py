from contextlib import contextmanager

import frappe
from frappe.model import core_doctypes_list, get_permitted_fields, is_default_field
from frappe.model.utils import get_fetch_values
from frappe.tests import IntegrationTestCase


class TestModelUtils(IntegrationTestCase):
    def test_get_fetch_values(self):
        doctype = "ToDo"

        self.assertEqual(get_fetch_values(doctype, "role", "System Manager"), {})

        self.assertEqual(get_fetch_values(doctype, "assigned_by", None), {"assigned_by_full_name": None})

        self.assertEqual(
            get_fetch_values(doctype, "assigned_by", "~not-a-user~"), {"assigned_by_full_name": None}
        )

        user = "test@example.com"
        full_name = frappe.db.get_value("User", user, "full_name")

        self.assertEqual(get_fetch_values(doctype, "assigned_by", user), {"assigned_by_full_name": full_name})

    def test_get_permitted_fields(self):
        todo_all_fields = get_permitted_fields("ToDo", user="Administrator")
        todo_all_columns = frappe.get_meta("ToDo").get_valid_columns()
        self.assertListEqual(todo_all_fields, todo_all_columns)

        with set_user("Guest"):
            guest_permitted_fields = get_permitted_fields("ToDo")
            self.assertNotIn("description", guest_permitted_fields)

        with set_user("Guest"):
            for doctype in core_doctypes_list:
                if doctype == "User":
                    continue
                with self.subTest(doctype=doctype):
                    all_columns = frappe.get_meta(doctype).get_valid_columns()
                    self.assertSequenceEqual(get_permitted_fields(doctype), all_columns)
            self.assertNotIn("email", get_permitted_fields("User"))

        with set_user("Administrator"):
            without_parent_fields = get_permitted_fields("Installed Application")
            with_parent_fields = get_permitted_fields(
                "Installed Application", parenttype="Installed Applications"
            )
            child_all_fields = frappe.get_meta("Installed Application").get_valid_columns()
            self.assertLess(len(without_parent_fields), len(with_parent_fields))
            self.assertSequenceEqual(set(with_parent_fields), set(child_all_fields))

        with set_user("Guest"):
            self.assertNotIn("app_name", get_permitted_fields("Installed Application"))
            self.assertNotIn(
                "app_name", get_permitted_fields("Installed Application", parenttype="Installed Applications")
            )

    def test_is_default_field(self):
        self.assertTrue(is_default_field("doctype"))
        self.assertTrue(is_default_field("name"))
        self.assertTrue(is_default_field("owner"))

        self.assertFalse(is_default_field({}))
        self.assertFalse(is_default_field("qwerty1234"))
        self.assertFalse(is_default_field(True))
        self.assertFalse(is_default_field(42))


@contextmanager
def set_user(user: str):
    past_user = frappe.session.user or "Administrator"
    frappe.set_user(user)
    yield
    frappe.set_user(past_user)
