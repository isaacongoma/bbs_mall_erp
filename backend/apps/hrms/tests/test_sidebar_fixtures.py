
import json
import os

import frappe
from frappe.desk.doctype.sidebar.convert_fixtures import export_path
from frappe.desk.doctype.sidebar.sidebar import resolve_sidebar
from frappe.model.sync import create_entity_file_map, get_doc_files
from frappe.tests import IntegrationTestCase

SIDEBAR_SHELLS = {
    "Expenses": "Expenses",
    "HR Setup": "HR Setup",
    "Leaves": "Leaves",
    "Payroll": "Payroll",
    "Performance": "Performance",
    "Recruitment": "Recruitment",
    "Shift and Attendance": "Shift & Attendance",
    "Tax and Benefits": "Tax & Benefits",
    "Tenure": "Tenure",
}


def fixture_path(module: str) -> str:
    return export_path(module, SIDEBAR_SHELLS[module])


def shipped(module: str) -> dict:
    with open(fixture_path(module)) as f:
        return json.load(f)


class TestTheFixturesAreWhereMigrateLooks(IntegrationTestCase):
    def test_every_semantic_module_ships_one(self):
        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                self.assertTrue(os.path.exists(fixture_path(module)))

    def test_they_declare_the_renamed_doctype(self):
        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                self.assertEqual(shipped(module)["doctype"], "Sidebar")

    def test_the_module_walk_picks_them_up(self):
        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                module_path = frappe.get_module_path(module)
                self.assertIn(fixture_path(module), get_doc_files(files=[], start_path=module_path))

    def test_record_name_and_filename_agree(self):
        known = create_entity_file_map(["Sidebar"])["Sidebar"]

        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                shell = SIDEBAR_SHELLS[module]
                self.assertEqual(shipped(module)["name"], shell)
                self.assertEqual(known.get(shell), fixture_path(module))


class TestTheModulesResolveToTheirShippedArrangement(IntegrationTestCase):

    def test_a_module_resolves_to_the_items_its_fixture_ships(self):
        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                resolved = resolve_sidebar(SIDEBAR_SHELLS[module], "Administrator")

                self.assertIsNotNone(resolved)
                self.assertEqual(
                    [item["label"] for item in resolved.items],
                    [item["label"] for item in shipped(module)["items"]],
                )

    def test_the_label_and_icon_are_the_fixture_s(self):
        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                resolved = resolve_sidebar(SIDEBAR_SHELLS[module], "Administrator")
                fixture = shipped(module)

                self.assertEqual(resolved.label, fixture["title"])
                self.assertEqual(resolved.header_icon, fixture["header_icon"])

    def test_a_module_opens_on_its_own_navigation(self):
        for module in SIDEBAR_SHELLS:
            with self.subTest(module=module):
                self.assertIsNotNone(resolve_sidebar(SIDEBAR_SHELLS[module], "Administrator").landing)
