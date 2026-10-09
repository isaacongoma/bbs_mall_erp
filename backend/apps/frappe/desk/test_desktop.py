import frappe
from frappe.desk.desktop import get_desktop_page
from frappe.tests import IntegrationTestCase


class TestDesktop(IntegrationTestCase):
    def test_get_desktop_page_accepts_native_dict(self):
        workspace = frappe.db.get_value("Workspace", {"public": 1}, "name")
        result = get_desktop_page({"name": workspace})
        self.assertIsInstance(result, dict)
        self.assertIn("charts", result)
