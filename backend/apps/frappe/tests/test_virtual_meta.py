from django.test import TestCase

import frappe
from apps.frappe.runtime import session


class VirtualMetaTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_docfield_query_by_parent(self):
        rows = frappe.get_all("DocField", filters={"parent": "Branch"}, fields=["fieldname", "fieldtype"])
        self.assertEqual([(r.fieldname, r.fieldtype) for r in rows], [("branch", "Data")])

    def test_docfield_child_table_links(self):
        rows = frappe.get_all(
            "DocField",
            filters=[["fieldtype", "=", "Table"], ["parent", "in", ("Holiday List", "Item Group")]],
            fields=["parent", "fieldname", "options as child_table"],
            as_list=1,
            order_by=None,
        )
        self.assertIn(("Holiday List", "holidays", "Holiday"), rows)
        self.assertIn(("Item Group", "taxes", "Item Tax"), rows)

    def test_doctype_query(self):
        singles = frappe.get_all("DocType", filters={"issingle": 1, "name": "Accounts Settings"}, pluck="name")
        self.assertEqual(singles, ["Accounts Settings"])
        tables = frappe.get_all("DocType", filters={"istable": 1}, pluck="name")
        self.assertIn("Holiday", tables)
