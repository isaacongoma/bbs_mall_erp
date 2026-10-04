from django.test import TestCase

import frappe
from apps.erpnext.geo.doctype.currency.currency import Currency, enable_default_currencies
from apps.erpnext.registry import get_model
from apps.erpnext.setup.doctype.terms_and_conditions.terms_and_conditions import (
    TermsandConditions,
    get_terms_and_conditions,
)
from apps.frappe import exceptions
from apps.frappe.runtime import get_doc, new_doc, session


class TermsAndConditionsTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def _terms(self, title, terms, **flags):
        doc = new_doc("Terms and Conditions")
        doc.title = title
        doc.terms = terms
        for key, value in flags.items():
            setattr(doc, key, value)
        return doc

    def test_controller_class_is_resolved(self):
        doc = self._terms("Controller Terms", "x", selling=1)
        doc.insert()
        self.assertIsInstance(get_doc("Terms and Conditions", doc.name), TermsandConditions)

    def test_requires_an_applicable_module(self):
        with self.assertRaises(exceptions.ValidationError) as raised:
            self._terms("No Module", "text", buying=0, selling=0, hr=0, disabled=0).insert()
        self.assertIn("At least one of the Applicable Modules", str(raised.exception))

    def test_template_syntax_error_is_rejected(self):
        with self.assertRaises(exceptions.ValidationError) as raised:
            self._terms("Broken", "{% if %}", selling=1).insert()
        self.assertIn("Syntax error in template", str(raised.exception))

    def test_get_terms_and_conditions_renders_template(self):
        doc = self._terms("Rendered", "Pay {{ customer }} within {{ days }} days", selling=1)
        doc.insert()
        self.assertEqual(
            get_terms_and_conditions(doc.name, {"customer": "Acme", "days": 30}),
            "Pay Acme within 30 days",
        )
        self.assertEqual(get_terms_and_conditions(doc.name, '{"customer": "Beta", "days": 7}'), "Pay Beta within 7 days")

    def test_get_terms_and_conditions_without_terms_returns_none(self):
        doc = self._terms("Empty", "", selling=1)
        doc.insert()
        self.assertIsNone(get_terms_and_conditions(doc.name, {}))

    def test_render_blocks_dunder_access(self):
        doc = self._terms("Unsafe", "{{ ''.__class__ }}", selling=1)
        doc.insert()
        with self.assertRaises(exceptions.ValidationError):
            get_terms_and_conditions(doc.name, {})


class CurrencyTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_controller_class_is_resolved(self):
        doc = new_doc("Currency")
        doc.currency_name = "ZZZ"
        doc.insert()
        self.assertIsInstance(get_doc("Currency", doc.name), Currency)

    def test_enable_default_currencies(self):
        model = get_model("Currency")
        for code in ("INR", "USD", "ZZZ"):
            if model.objects.filter(pk=code).exists():
                model.objects.filter(pk=code).update(enabled=0)
                continue
            doc = new_doc("Currency")
            doc.currency_name = code
            doc.enabled = 0
            doc.insert()
        enable_default_currencies()
        self.assertEqual(model.objects.get(pk="INR").enabled, 1)
        self.assertEqual(model.objects.get(pk="USD").enabled, 1)
        self.assertEqual(model.objects.get(pk="ZZZ").enabled, 0)
