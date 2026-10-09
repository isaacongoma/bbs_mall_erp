from django.test import TestCase

import frappe
from apps.erpnext.accounts.doctype.accounts_settings.accounts_settings import (
    AccountsSettings,
    get_posting_date_confirmation,
)
from apps.frappe.runtime import get_doc, session


class TestAccountsSettings(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_controller_class_is_resolved(self):
        self.assertIsInstance(get_doc("Accounts Settings"), AccountsSettings)

    def test_posting_date_confirmation_uses_current_setting(self):
        for enabled in (0, 1, 0):
            frappe.db.set_single_value("Accounts Settings", "confirm_before_resetting_posting_date", enabled)
            self.assertEqual(get_posting_date_confirmation(), enabled)

    def test_stale_days(self):
        cur_settings = frappe.get_doc("Accounts Settings", "Accounts Settings")
        cur_settings.allow_stale = 0
        cur_settings.stale_days = 0

        self.assertRaises(frappe.ValidationError, cur_settings.save)

        cur_settings.stale_days = -1
        self.assertRaises(frappe.ValidationError, cur_settings.save)

    def test_cannot_enable_both_auto_tax_settings(self):
        settings = get_doc("Accounts Settings")
        settings.add_taxes_from_item_tax_template = 1
        settings.add_taxes_from_taxes_and_charges_template = 1
        with self.assertRaises(frappe.ValidationError) as raised:
            settings.save()
        self.assertIn("You cannot enable both the settings", str(raised.exception))

    def test_changing_item_tax_template_flag_sets_a_global_default(self):
        settings = get_doc("Accounts Settings")
        settings.add_taxes_from_item_tax_template = 0
        settings.save()
        self.assertEqual(frappe.db.get_default("add_taxes_from_item_tax_template"), "0")

    def test_auto_reconciliation_trigger_bounds(self):
        settings = get_doc("Accounts Settings")
        settings.auto_reconciliation_job_trigger = 75
        with self.assertRaises(frappe.ValidationError) as raised:
            settings.save()
        self.assertIn("Cron Interval should be between 1 and 59 Min", str(raised.exception))

    def test_reconciliation_queue_size_bounds(self):
        settings = get_doc("Accounts Settings")
        settings.reconciliation_queue_size = 2
        with self.assertRaises(frappe.ValidationError) as raised:
            settings.save()
        self.assertIn("Queue Size should be between 5 and 100", str(raised.exception))
