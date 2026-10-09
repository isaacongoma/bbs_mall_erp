import frappe
from frappe.utils import getdate, random_string

from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice
from erpnext.selling.report.customer_acquisition_and_loyalty.customer_acquisition_and_loyalty import (
    get_customer_stats,
)
from erpnext.tests.utils import ERPNextTestSuite


class TestCustomerAcquisitionAndLoyalty(ERPNextTestSuite):
    def test_new_vs_repeat_classification(self):
        first_date = "2017-04-05"
        second_date = "2017-04-20"
        month_key = getdate(first_date).strftime("%Y-%m")
        filters = frappe._dict(
            {"from_date": "2017-01-01", "to_date": "2017-04-30", "company": "_Test Company"}
        )

        customer = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": "_Test CAL Customer " + random_string(8),
                "customer_group": "_Test Customer Group",
                "customer_type": "Individual",
                "territory": "_Test Territory",
            }
        ).insert()

        base = get_customer_stats(filters)
        base_bucket = base.get(month_key, {"new": [0, 0.0], "repeat": [0, 0.0]})
        base_new = base_bucket["new"][0]
        base_new_rev = base_bucket["new"][1]
        base_repeat = base_bucket["repeat"][0]
        base_repeat_rev = base_bucket["repeat"][1]

        si1 = create_sales_invoice(
            customer=customer.name, company="_Test Company", posting_date=first_date, rate=100
        )
        si2 = create_sales_invoice(
            customer=customer.name, company="_Test Company", posting_date=second_date, rate=250
        )

        stats = get_customer_stats(filters)
        bucket = stats.get(month_key)
        self.assertIsNotNone(bucket, "expected a bucket for posting month " + month_key)

        self.assertEqual(bucket["new"][0] - base_new, 1)
        self.assertEqual(bucket["repeat"][0] - base_repeat, 1)

        self.assertAlmostEqual(bucket["new"][1] - base_new_rev, si1.base_grand_total)
        self.assertAlmostEqual(bucket["repeat"][1] - base_repeat_rev, si2.base_grand_total)

    def test_territory_tree_view_classification(self):
        territory = "_Test Territory"
        first_date = "2017-05-05"
        second_date = "2017-05-20"
        filters = frappe._dict(
            {"from_date": "2017-01-01", "to_date": "2017-05-31", "company": "_Test Company"}
        )

        customer = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": "_Test CAL Territory Customer " + random_string(8),
                "customer_group": "_Test Customer Group",
                "customer_type": "Individual",
                "territory": territory,
            }
        ).insert()

        base = get_customer_stats(filters, tree_view=True)
        base_bucket = base.get(territory, {"new": [0, 0.0], "repeat": [0, 0.0]})
        base_new = base_bucket["new"][0]
        base_new_rev = base_bucket["new"][1]
        base_repeat = base_bucket["repeat"][0]
        base_repeat_rev = base_bucket["repeat"][1]

        si1 = create_sales_invoice(
            customer=customer.name, company="_Test Company", posting_date=first_date, rate=100
        )
        si2 = create_sales_invoice(
            customer=customer.name, company="_Test Company", posting_date=second_date, rate=250
        )
        self.assertEqual(si1.territory, territory)
        self.assertEqual(si2.territory, territory)

        stats = get_customer_stats(filters, tree_view=True)
        bucket = stats.get(territory)
        self.assertIsNotNone(bucket, "expected a bucket keyed by territory " + territory)

        self.assertEqual(bucket["new"][0] - base_new, 1)
        self.assertEqual(bucket["repeat"][0] - base_repeat, 1)

        self.assertAlmostEqual(bucket["new"][1] - base_new_rev, si1.base_grand_total)
        self.assertAlmostEqual(bucket["repeat"][1] - base_repeat_rev, si2.base_grand_total)
