from django.test import TestCase

import frappe
from apps.frappe.query_builder.functions import Count, IfNull, Sum
from apps.frappe.runtime import new_doc, session


def make_branch(name):
    doc = new_doc("Branch")
    doc.branch = name
    doc.insert()
    return doc


class QueryBuilderTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        make_branch("QB One")
        make_branch("QB Two")
        make_branch("Other Branch")
        self.branch = frappe.qb.DocType("Branch")

    def test_table_name_and_sql(self):
        query = frappe.qb.from_(self.branch).select(self.branch.name)
        self.assertEqual(query.get_sql(), 'SELECT "name" FROM "tabBranch"')

    def test_select_where_run_as_dict(self):
        rows = (
            frappe.qb.from_(self.branch)
            .select(self.branch.name, self.branch.branch)
            .where(self.branch.name == "QB One")
            .run(as_dict=True)
        )
        self.assertEqual([(row.name, row.branch) for row in rows], [("QB One", "QB One")])

    def test_run_returns_tuples_by_default_and_pluck(self):
        query = frappe.qb.from_(self.branch).select(self.branch.name).where(self.branch.name.like("QB%")).orderby(self.branch.name)
        self.assertEqual(list(query.run()), [("QB One",), ("QB Two",)])
        self.assertEqual(query.run(pluck="name"), ["QB One", "QB Two"])

    def test_like_is_case_insensitive_on_postgres(self):
        rows = frappe.qb.from_(self.branch).select(self.branch.name).where(self.branch.name.like("qb%")).run(pluck=True)
        self.assertEqual(sorted(rows), ["QB One", "QB Two"])

    def test_parameters_are_bound_not_interpolated(self):
        hostile = "x'; DROP TABLE \"tabBranch\"; --"
        rows = frappe.qb.from_(self.branch).select(self.branch.name).where(self.branch.name == hostile).run()
        self.assertEqual(list(rows), [])
        self.assertEqual(len(frappe.qb.from_(self.branch).select(self.branch.name).run()), 3)

    def test_aggregates_and_group_by(self):
        rows = (
            frappe.qb.from_(self.branch)
            .select(Count(self.branch.name).as_("total"))
            .where(self.branch.name.like("QB%"))
            .run(as_dict=True)
        )
        self.assertEqual(rows[0].total, 2)

    def test_ifnull_function(self):
        rows = (
            frappe.qb.from_(self.branch)
            .select(IfNull(self.branch.name, "").as_("n"))
            .where(self.branch.name == "QB One")
            .run(as_dict=True)
        )
        self.assertEqual(rows[0].n, "QB One")

    def test_update_and_delete(self):
        frappe.qb.update(self.branch).set(self.branch.branch, "QB Renamed").where(self.branch.name == "QB One").run()
        self.assertEqual(frappe.db.get_value("Branch", "QB One", "branch"), "QB Renamed")
        frappe.qb.from_(self.branch).delete().where(self.branch.name == "Other Branch").run()
        self.assertFalse(frappe.db.exists("Branch", "Other Branch"))

    def test_insert_into(self):
        frappe.qb.into(self.branch).columns("name", "branch", "owner", "modified_by", "creation", "modified", "docstatus", "idx").insert("QB Insert", "QB Insert", "Administrator", "Administrator", "2024-01-01 00:00:00", "2024-01-01 00:00:00", 0, 0).run()
        self.assertTrue(frappe.db.exists("Branch", "QB Insert"))

    def test_get_query_helper(self):
        query = frappe.qb.get_query("Branch", fields=["name as value"], filters={"name": ["like", "QB%"]}, order_by="name asc")
        self.assertEqual([row.value for row in query.run(as_dict=True)], ["QB One", "QB Two"])
        counts = frappe.qb.get_query("Branch", fields=[{"COUNT": "name", "as": "total"}], filters=[["name", "in", ["QB One", "QB Two"]]]).run(as_dict=True)
        self.assertEqual(counts[0].total, 2)
        limited = frappe.qb.get_query("Branch", fields=["name"], order_by="name desc", limit=1).run(pluck="name")
        self.assertEqual(limited, ["QB Two"])
