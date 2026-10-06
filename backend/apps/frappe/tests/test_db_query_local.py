from django.test import TestCase

import frappe
from apps.core.models import User
from apps.erpnext.registry import get_model
from apps.frappe import exceptions
from apps.frappe.models import HasRole
from apps.frappe.runtime import get_doc, new_doc, session


def make_group(name, parent=None, is_group=0):
    doc = new_doc("Item Group")
    doc.item_group_name = name
    doc.parent_item_group = parent
    doc.is_group = is_group
    doc.insert()
    return doc


class DatabaseQueryTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.root = make_group("DQ Root", "All Item Groups", 1) if get_model("Item Group").objects.filter(pk="All Item Groups").exists() else make_group("DQ Root", None, 1)
        self.child_a = make_group("DQ Alpha", self.root.name, 1)
        self.child_b = make_group("DQ Beta", self.root.name, 0)
        self.leaf = make_group("DQ Alpha Leaf", self.child_a.name, 0)

    def names(self, **kwargs):
        return sorted(row.name for row in frappe.get_all("Item Group", fields=["name"], **kwargs))

    def test_dict_equality_and_in_filters(self):
        self.assertEqual(self.names(filters={"name": "DQ Beta"}), ["DQ Beta"])
        self.assertEqual(
            self.names(filters={"name": ["in", ["DQ Alpha", "DQ Beta"]]}),
            ["DQ Alpha", "DQ Beta"],
        )
        self.assertEqual(self.names(filters={"name": ("not in", ["DQ Alpha", "DQ Beta", "DQ Root", "DQ Alpha Leaf"]), "parent_item_group": self.root.name}), [])

    def test_list_filters_with_and_without_doctype(self):
        self.assertEqual(self.names(filters=[["name", "like", "DQ Alpha%"]]), ["DQ Alpha", "DQ Alpha Leaf"])
        self.assertEqual(self.names(filters=[["Item Group", "name", "=", "DQ Beta"]]), ["DQ Beta"])
        self.assertEqual(self.names(filters=["name", "=", "DQ Beta"]), ["DQ Beta"])

    def test_like_variants(self):
        self.assertEqual(self.names(filters=[["name", "like", "%Alpha%"]]), ["DQ Alpha", "DQ Alpha Leaf"])
        self.assertEqual(self.names(filters=[["name", "like", "%Leaf"]]), ["DQ Alpha Leaf"])
        self.assertEqual(self.names(filters=[["name", "like", "dq beta"]]), ["DQ Beta"])
        self.assertEqual(self.names(filters=[["name", "like", "DQ _eta"]]), ["DQ Beta"])
        self.assertNotIn("DQ Beta", self.names(filters=[["name", "not like", "%Beta%"]]))

    def test_comparison_and_between(self):
        count = frappe.get_all("Item Group", filters=[["lft", ">=", 0]], fields=["name"])
        self.assertGreaterEqual(len(count), 4)
        none = frappe.get_all("Item Group", filters=[["lft", "<", 0]], fields=["name"])
        self.assertEqual(none, [])
        between = frappe.get_all("Item Group", filters=[["lft", "between", [0, 10**6]]], fields=["name"])
        self.assertEqual(len(between), len(count))

    def test_is_set_and_not_set(self):
        with_parent = self.names(filters=[["parent_item_group", "is", "set"]])
        without_parent = self.names(filters=[["parent_item_group", "is", "not set"]])
        self.assertIn("DQ Beta", with_parent)
        self.assertNotIn("DQ Beta", without_parent)

    def test_tree_operators(self):
        self.assertEqual(self.names(filters=[["name", "descendants of", self.child_a.name]]), ["DQ Alpha Leaf"])
        self.assertEqual(
            self.names(filters=[["lft", ">", 0], ["name", "in", ["DQ Alpha", "DQ Alpha Leaf", "DQ Beta"]]]),
            ["DQ Alpha", "DQ Alpha Leaf", "DQ Beta"],
        )
        child = get_doc("Item Group", "DQ Alpha Leaf")
        names = frappe.get_all("Item Group", filters=[["parent_item_group", "descendants of", "DQ Root"]], fields=["name"])
        self.assertIsInstance(names, list)
        self.assertIn(
            "DQ Alpha",
            [row.name for row in frappe.get_all("Item Group", filters=[["name", "descendants of", "DQ Root"]], fields=["name"])],
        )
        self.assertIn(
            "DQ Alpha Leaf",
            [row.name for row in frappe.get_all("Item Group", filters=[["name", "descendants of", "DQ Root"]], fields=["name"])],
        )
        self.assertIn(
            "DQ Root",
            [row.name for row in frappe.get_all("Item Group", filters=[["name", "descendants of (inclusive)", "DQ Root"]], fields=["name"])],
        )
        self.assertEqual(
            [row.name for row in frappe.get_all("Item Group", filters=[["name", "ancestors of", child.name]], fields=["name"], order_by="lft asc")][-2:],
            ["DQ Root", "DQ Alpha"],
        )
        self.assertNotIn(
            "DQ Alpha",
            [row.name for row in frappe.get_all("Item Group", filters=[["name", "not descendants of", "DQ Root"]], fields=["name"])],
        )

    def test_or_filters(self):
        rows = frappe.get_all(
            "Item Group",
            filters={"parent_item_group": self.root.name},
            or_filters=[["name", "=", "DQ Alpha"], ["name", "=", "DQ Beta"]],
            fields=["name"],
        )
        self.assertEqual(sorted(row.name for row in rows), ["DQ Alpha", "DQ Beta"])

    def test_field_alias_pluck_and_as_list(self):
        rows = frappe.get_all("Item Group", filters={"name": "DQ Beta"}, fields=["name as value", "is_group as expandable"])
        self.assertEqual(rows[0].value, "DQ Beta")
        self.assertEqual(rows[0].expandable, 0)
        self.assertEqual(frappe.get_all("Item Group", filters={"name": "DQ Beta"}, pluck="name"), ["DQ Beta"])
        self.assertEqual(frappe.get_all("Item Group", filters={"name": "DQ Beta"}, fields=["name", "is_group"], as_list=True), [["DQ Beta", 0]])

    def test_aggregates_and_group_by(self):
        total = frappe.get_all("Item Group", filters={"parent_item_group": self.root.name}, fields=["count(name) as total"])
        self.assertEqual(total[0].total, 2)
        grouped = frappe.get_all(
            "Item Group",
            filters={"parent_item_group": self.root.name},
            fields=["is_group", "count(name) as total"],
            group_by="is_group",
            order_by="is_group asc",
        )
        self.assertEqual([(row.is_group, row.total) for row in grouped], [(0, 1), (1, 1)])

    def test_order_by_limit_and_start(self):
        ordered = frappe.get_all(
            "Item Group",
            filters={"parent_item_group": self.root.name},
            fields=["name"],
            order_by="name desc",
        )
        self.assertEqual([row.name for row in ordered], ["DQ Beta", "DQ Alpha"])
        limited = frappe.get_all(
            "Item Group", filters={"parent_item_group": self.root.name}, fields=["name"], order_by="name asc", limit=1, start=1
        )
        self.assertEqual([row.name for row in limited], ["DQ Beta"])

    def test_get_list_defaults_to_twenty_rows(self):
        for index in range(25):
            make_group(f"DQ Bulk {index:02d}", self.root.name, 0)
        self.assertEqual(len(frappe.get_list("Item Group", fields=["name"])), 20)
        self.assertGreaterEqual(len(frappe.get_all("Item Group", fields=["name"])), 29)
        self.assertEqual(len(frappe.get_list("Item Group", fields=["name"], limit_page_length=0)), len(frappe.get_all("Item Group", fields=["name"])))

    def test_unknown_field_is_rejected(self):
        with self.assertRaises(exceptions.DataError):
            frappe.get_all("Item Group", fields=["name", "no_such_field"])
        with self.assertRaises(exceptions.DataError):
            frappe.get_all("Item Group", filters={"no_such_field": 1})
        with self.assertRaises(exceptions.DataError):
            frappe.get_all("Item Group", filters=[["name", "regex", "x"]])
        with self.assertRaises(exceptions.DataError):
            frappe.get_all("Item Group", fields=["name"], order_by="no_such_field asc")

    def test_child_table_filter(self):
        tax_row = {"item_tax_template": "DQ Template", "tax_category": ""}
        group = get_doc("Item Group", "DQ Beta")
        group.append("taxes", tax_row)
        group.save()
        rows = frappe.get_all(
            "Item Group", filters=[["Item Tax", "item_tax_template", "=", "DQ Template"]], fields=["name"]
        )
        self.assertEqual([row.name for row in rows], ["DQ Beta"])

    def test_permissions_are_enforced_by_get_list_but_not_get_all(self):
        user = User.objects.create_user(username="dq-nobody", email="dq-nobody@bbs-erp.local", password="x")
        session.user = user.email
        with self.assertRaises(exceptions.PermissionError):
            frappe.get_list("Item Group", fields=["name"])
        self.assertTrue(frappe.get_all("Item Group", fields=["name"]))
        HasRole.objects.create(name="dq-nobody-role", parent=user.email, role="Item Manager")
        self.assertTrue(frappe.get_list("Item Group", fields=["name"]))

    def test_ignore_permissions_flag(self):
        user = User.objects.create_user(username="dq-nobody2", email="dq-nobody2@bbs-erp.local", password="x")
        session.user = user.email
        rows = frappe.get_list("Item Group", fields=["name"], ignore_permissions=True)
        self.assertTrue(rows)
