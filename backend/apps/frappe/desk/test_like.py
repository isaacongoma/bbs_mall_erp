import frappe
from frappe.desk.like import toggle_like
from frappe.tests import IntegrationTestCase


class TestLike(IntegrationTestCase):
    def _liked_by(self, todo):
        return frappe.parse_json(frappe.db.get_value("ToDo", todo.name, "_liked_by") or "[]")

    def test_toggle_like_accepts_bool_and_string(self):
        todo = frappe.get_doc(doctype="ToDo", description="like me").insert()

        toggle_like("ToDo", todo.name, add=True)
        self.assertIn(frappe.session.user, self._liked_by(todo))

        toggle_like("ToDo", todo.name, add=False)
        self.assertNotIn(frappe.session.user, self._liked_by(todo))

        toggle_like("ToDo", todo.name, add="Yes")
        self.assertIn(frappe.session.user, self._liked_by(todo))

        toggle_like("ToDo", todo.name, add="No")
        self.assertNotIn(frappe.session.user, self._liked_by(todo))

        todo.delete()
