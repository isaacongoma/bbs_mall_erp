import frappe
from pypika.terms import Criterion

from erpnext.tests.utils import ERPNextTestSuite
from erpnext.utilities.query import get_filter_conditions_qb


class TestQueryHelpers(ERPNextTestSuite):
    def test_get_filter_conditions_qb_negation_dict(self):
        def _where(filters):
            dt = frappe.qb.DocType("DocType")
            criteria = get_filter_conditions_qb("DocType", filters, ignore_permissions=True)
            return frappe.qb.from_(dt).select(dt.name).where(Criterion.all(criteria)).get_sql()

        self.assertIn("<>", _where({"istable": "!1"}))
        self.assertNotIn("'!1'", _where({"istable": "!1"}))
        self.assertIn("=", _where({"istable": "1"}))
        self.assertNotIn("<>", _where({"istable": "1"}))
        self.assertIn("<>", _where({"istable": ["!=", "1"]}))
