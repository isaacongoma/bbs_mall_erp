from django.test import TestCase

import frappe
import frappe.defaults
from apps.core.models import User
from apps.frappe import exceptions
from apps.frappe.models import Singles, UserPermission
from apps.frappe.runtime import get_doc, session


class SingleDoctypeTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_single_loads_defaults_from_meta(self):
        doc = get_doc("Accounts Settings")
        self.assertEqual(doc.name, "Accounts Settings")
        self.assertEqual(doc.doctype, "Accounts Settings")
        self.assertEqual(doc.stale_days, 1)
        self.assertEqual(doc.show_balance_in_coa, 1)

    def test_save_persists_to_singles_with_types(self):
        doc = get_doc("Accounts Settings")
        doc.over_billing_allowance = 12.5
        doc.stale_days = 5
        doc.allow_stale = 0
        doc.save()
        self.assertTrue(Singles.objects.filter(doctype="Accounts Settings", field="stale_days").exists())
        reloaded = get_doc("Accounts Settings")
        self.assertEqual(reloaded.over_billing_allowance, 12.5)
        self.assertEqual(reloaded.stale_days, 5)
        self.assertIsInstance(reloaded.stale_days, int)
        self.assertEqual(frappe.db.get_single_value("Accounts Settings", "over_billing_allowance"), 12.5)

    def test_get_and_set_single_value(self):
        frappe.db.set_single_value("Accounts Settings", "stale_days", 9)
        self.assertEqual(frappe.db.get_single_value("Accounts Settings", "stale_days"), 9)
        frappe.db.set_single_value("Accounts Settings", {"stale_days": 3, "allow_stale": 1})
        self.assertEqual(frappe.db.get_single_value("Accounts Settings", "allow_stale"), 1)
        self.assertEqual(frappe.db.get_single_value("Accounts Settings", "no_such_field"), None)

    def test_db_set_on_single(self):
        doc = get_doc("Accounts Settings")
        doc.db_set("stale_days", 7)
        self.assertEqual(get_doc("Accounts Settings").stale_days, 7)

    def test_singles_dict(self):
        values = frappe.db.get_singles_dict("Accounts Settings")
        self.assertEqual(values.stale_days, 1)

    def test_single_validation_runs(self):
        doc = get_doc("Accounts Settings")
        doc.add_taxes_from_item_tax_template = 1
        doc.add_taxes_from_taxes_and_charges_template = 1
        with self.assertRaises(exceptions.ValidationError):
            doc.save()

    def test_get_doc_with_explicit_name(self):
        self.assertEqual(get_doc("Accounts Settings", "Accounts Settings").name, "Accounts Settings")


class DefaultsTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_global_default_round_trip(self):
        frappe.defaults.set_global_default("company", "Acme")
        self.assertEqual(frappe.db.get_default("company"), "Acme")
        self.assertEqual(frappe.defaults.get_global_default("company"), "Acme")
        frappe.defaults.set_global_default("company", "Beta")
        self.assertEqual(frappe.db.get_default("company"), "Beta")
        self.assertEqual(frappe.db.get_defaults("company"), "Beta")

    def test_set_default_with_none_clears(self):
        frappe.defaults.set_global_default("currency", "KES")
        frappe.defaults.set_default("currency", None, "__default")
        self.assertIsNone(frappe.db.get_default("currency"))

    def test_user_defaults_override_global(self):
        frappe.defaults.set_global_default("country", "Kenya")
        frappe.defaults.set_user_default("country", "Uganda", user="u1@bbs-erp.local")
        merged = frappe.defaults.get_defaults("u1@bbs-erp.local")
        self.assertEqual(merged.country, "Uganda")
        self.assertEqual(frappe.defaults.get_defaults("u2@bbs-erp.local").country, "Kenya")

    def test_multiple_values_become_a_list(self):
        frappe.defaults.add_global_default("language", "en")
        frappe.defaults.add_global_default("language", "sw")
        self.assertEqual(frappe.defaults.get_defaults_for("__default").language, ["en", "sw"])

    def test_clear_default_requires_a_filter(self):
        with self.assertRaises(Exception):
            frappe.defaults.clear_default()
        frappe.defaults.set_global_default("fiscal_year", "2025")
        frappe.defaults.clear_default(key="fiscal_year", parent="__default")
        self.assertIsNone(frappe.db.get_default("fiscal_year"))

    def test_user_default_respects_user_permissions(self):
        user = User.objects.create_user(username="dflt-user", email="dflt-user@bbs-erp.local", password="x")
        UserPermission.objects.create(name="dflt-up", user=user.email, allow="Company", for_value="Acme", is_default=1)
        self.assertEqual(frappe.defaults.get_user_default("Company", user.email), "Acme")
