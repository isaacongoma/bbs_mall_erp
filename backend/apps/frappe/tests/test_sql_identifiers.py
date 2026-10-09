from django.test import TestCase

import frappe


class BareTableNameTests(TestCase):
    def test_unquoted_table_name_is_resolved(self):
        self.assertEqual(frappe.db.sql("select count(*) from tabCurrency")[0][0], frappe.db.sql('select count(*) from "tabCurrency"')[0][0])

    def test_backticked_table_name_is_unchanged(self):
        self.assertEqual(frappe.db.sql("select count(*) from `tabCurrency`")[0][0], frappe.db.sql('select count(*) from "tabCurrency"')[0][0])
