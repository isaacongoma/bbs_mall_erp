import frappe
from frappe import _
from frappe.utils import today

from erpnext.accounts.utils import get_fiscal_year
from erpnext.tests.utils import ERPNextTestSuite


class TestPurchaseOrderTrends(ERPNextTestSuite):
    def test_supplier_with_divergent_stored_name_stays_one_row(self):
        from erpnext.buying.doctype.purchase_order.test_purchase_order import create_purchase_order
        from erpnext.buying.report.purchase_order_trends.purchase_order_trends import execute

        create_purchase_order(supplier="_Test Supplier", qty=3, rate=100)
        po2 = create_purchase_order(supplier="_Test Supplier", qty=2, rate=100)
        frappe.db.set_value("Purchase Order", po2.name, "supplier_name", "_Test Supplier (renamed)")

        filters = {
            "company": "_Test Company",
            "period": "Monthly",
            "based_on": "Supplier",
        }
        columns, data, _chart_none, _chart = execute(filters)

        self.assertTrue(columns)
        supplier_rows = [row for row in data if row[0] == "_Test Supplier"]
        self.assertEqual(len(supplier_rows), 1)

    def test_total_row_not_double_counted_in_chart(self):
        from erpnext.buying.doctype.purchase_order.test_purchase_order import create_purchase_order
        from erpnext.buying.report.purchase_order_trends.purchase_order_trends import execute

        create_purchase_order(supplier="_Test Supplier", qty=3, rate=100, transaction_date=today())

        fiscal_year = get_fiscal_year(today())[0]

        filters = frappe._dict(
            {
                "company": "_Test Company",
                "fiscal_year": fiscal_year,
                "period": "Monthly",
                "based_on": "Item",
            }
        )

        columns, data, _message, chart = execute(filters)

        self.assertTrue(columns)
        self.assertTrue(data)

        total_row = next(row for row in data if row[0] == f"'{_('Total')}'")
        expected_total = total_row[-1]

        chart_total = sum(chart["data"]["datasets"][0]["values"])

        self.assertEqual(chart_total, expected_total)
        self.assertEqual(chart_total, 300)

    def test_chart_currency_matches_company_currency(self):
        from erpnext.buying.doctype.purchase_order.test_purchase_order import create_purchase_order
        from erpnext.buying.report.purchase_order_trends.purchase_order_trends import execute

        create_purchase_order(supplier="_Test Supplier", qty=1, rate=100, transaction_date=today())

        fiscal_year = get_fiscal_year(today())[0]

        filters = frappe._dict(
            {
                "company": "_Test Company",
                "fiscal_year": fiscal_year,
                "period": "Monthly",
                "based_on": "Item",
            }
        )

        _columns, _data, _message, chart = execute(filters)

        expected_currency = frappe.get_cached_value("Company", "_Test Company", "default_currency")
        self.assertEqual(chart["currency"], expected_currency)

    def test_group_by_chart_matches_table_total_with_mixed_group_sizes(self):
        from erpnext.buying.doctype.purchase_order.test_purchase_order import create_purchase_order
        from erpnext.buying.report.purchase_order_trends.purchase_order_trends import execute

        create_purchase_order(
            item_code="_Test Item", supplier="_Test Supplier", qty=3, rate=100, transaction_date=today()
        )
        create_purchase_order(
            item_code="_Test Item", supplier="_Test Supplier 1", qty=2, rate=100, transaction_date=today()
        )
        create_purchase_order(
            item_code="_Test Item 2", supplier="_Test Supplier", qty=1, rate=100, transaction_date=today()
        )

        fiscal_year = get_fiscal_year(today())[0]
        filters = frappe._dict(
            {
                "company": "_Test Company",
                "fiscal_year": fiscal_year,
                "period": "Monthly",
                "based_on": "Item",
                "group_by": "Supplier",
            }
        )

        columns, data, _message, chart = execute(filters)
        self.assertTrue(columns)
        self.assertTrue(data)

        total_row = next(row for row in data if row[0] == f"'{_('Total')}'")
        expected_total = total_row[-1]
        chart_total = sum(chart["data"]["datasets"][0]["values"])

        self.assertEqual(expected_total, 600)
        self.assertEqual(chart_total, expected_total)

    def test_group_by_swapped_roles_based_on_supplier_group_by_item(self):
        from erpnext.buying.doctype.purchase_order.test_purchase_order import create_purchase_order
        from erpnext.buying.report.purchase_order_trends.purchase_order_trends import execute

        create_purchase_order(
            item_code="_Test Item", supplier="_Test Supplier", qty=3, rate=100, transaction_date=today()
        )
        create_purchase_order(
            item_code="_Test Item 2", supplier="_Test Supplier", qty=1, rate=100, transaction_date=today()
        )

        fiscal_year = get_fiscal_year(today())[0]
        filters = frappe._dict(
            {
                "company": "_Test Company",
                "fiscal_year": fiscal_year,
                "period": "Monthly",
                "based_on": "Supplier",
                "group_by": "Item",
            }
        )

        columns, data, _message, chart = execute(filters)
        total_row = next(row for row in data if row[0] == f"'{_('Total')}'")
        expected_total = total_row[-1]
        chart_total = sum(chart["data"]["datasets"][0]["values"])

        self.assertEqual(expected_total, 400)
        self.assertEqual(chart_total, expected_total)

    def test_group_by_single_group_value_not_zeroed(self):
        from erpnext.buying.doctype.purchase_order.test_purchase_order import create_purchase_order
        from erpnext.buying.report.purchase_order_trends.purchase_order_trends import execute

        create_purchase_order(
            item_code="_Test Item", supplier="_Test Supplier", qty=2, rate=150, transaction_date=today()
        )

        fiscal_year = get_fiscal_year(today())[0]
        filters = frappe._dict(
            {
                "company": "_Test Company",
                "fiscal_year": fiscal_year,
                "period": "Monthly",
                "based_on": "Item",
                "group_by": "Supplier",
            }
        )

        columns, data, _message, chart = execute(filters)
        chart_total = sum(chart["data"]["datasets"][0]["values"])

        self.assertGreater(chart_total, 0)
        self.assertEqual(chart_total, 300)
