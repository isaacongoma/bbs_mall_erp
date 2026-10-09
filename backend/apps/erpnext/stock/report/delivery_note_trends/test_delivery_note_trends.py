import frappe

from erpnext.stock.doctype.delivery_note.test_delivery_note import create_delivery_note
from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
from erpnext.stock.report.delivery_note_trends.delivery_note_trends import execute
from erpnext.tests.utils import ERPNextTestSuite

ITEM = "_Test Item"
WAREHOUSE = "Stores - _TC"
CUSTOMER = "_Test Customer"


class TestDeliveryNoteTrends(ERPNextTestSuite):
    def run_report_full(self, **extra):
        filters = frappe._dict(
            {
                "company": "_Test Company",
                "fiscal_year": "_Test Fiscal Year 2026",
                "period": "Yearly",
                "based_on": "Item",
                "group_by": "",
            }
        )
        filters.update(extra)
        columns, data = execute(filters)[:2]
        return columns, data

    @staticmethod
    def labels(columns):
        return [c.split(":")[0] if isinstance(c, str) else c.get("label") for c in columns]

    def find_row(self, columns, data, match):
        labels = self.labels(columns)
        for row in data:
            if all(row[labels.index(label)] == value for label, value in match.items()):
                return row
        return None

    def value(self, columns, row, label):
        if not row:
            return 0
        return row[self.labels(columns).index(label)] or 0

    def values(self, match, wanted_labels, **extra):
        columns, data = self.run_report_full(**extra)
        row = self.find_row(columns, data, match)
        return {label: self.value(columns, row, label) for label in wanted_labels}

    def deliver(self, qty=5, rate=200, customer=CUSTOMER, posting_date="2026-06-01"):
        make_stock_entry(
            item_code=ITEM, to_warehouse=WAREHOUSE, qty=qty + 10, rate=100, posting_date=posting_date
        )
        create_delivery_note(
            item_code=ITEM,
            warehouse=WAREHOUSE,
            qty=qty,
            rate=rate,
            customer=customer,
            company="_Test Company",
            posting_date=posting_date,
        )

    def test_delivery_qty_in_trend(self):
        cols = ["_Test Fiscal Year 2026 (Qty)", "_Test Fiscal Year 2026 (Amt)", "Total(Qty)", "Total(Amt)"]
        before = self.values({"Item": ITEM}, cols)
        self.deliver()
        after = self.values({"Item": ITEM}, cols)
        self.assertEqual(after[cols[0]] - before[cols[0]], 5)
        self.assertEqual(after[cols[1]] - before[cols[1]], 1000)
        self.assertEqual(after["Total(Qty)"] - before["Total(Qty)"], 5)
        self.assertEqual(after["Total(Amt)"] - before["Total(Amt)"], 1000)

    def test_monthly_period_buckets(self):
        cols = ["Jun (Qty)", "Jun (Amt)", "Total(Qty)", "Total(Amt)"]
        before = self.values({"Item": ITEM}, cols, period="Monthly")
        self.deliver(posting_date="2026-06-01")
        after = self.values({"Item": ITEM}, cols, period="Monthly")
        self.assertEqual(after["Jun (Qty)"] - before["Jun (Qty)"], 5)
        self.assertEqual(after["Jun (Amt)"] - before["Jun (Amt)"], 1000)
        self.assertEqual(after["Total(Qty)"] - before["Total(Qty)"], 5)
        self.assertEqual(after["Total(Amt)"] - before["Total(Amt)"], 1000)

    def test_quarterly_period_buckets(self):
        cols = ["Apr-Jun (Qty)", "Apr-Jun (Amt)", "Total(Qty)"]
        before = self.values({"Item": ITEM}, cols, period="Quarterly")
        self.deliver(posting_date="2026-06-01")
        after = self.values({"Item": ITEM}, cols, period="Quarterly")
        self.assertEqual(after["Apr-Jun (Qty)"] - before["Apr-Jun (Qty)"], 5)
        self.assertEqual(after["Apr-Jun (Amt)"] - before["Apr-Jun (Amt)"], 1000)
        self.assertEqual(after["Total(Qty)"] - before["Total(Qty)"], 5)

    def test_based_on_customer(self):
        cols = ["Total(Qty)", "Total(Amt)"]
        before = self.values({"Customer": CUSTOMER}, cols, based_on="Customer")
        self.deliver(customer=CUSTOMER)
        after = self.values({"Customer": CUSTOMER}, cols, based_on="Customer")
        self.assertEqual(after["Total(Qty)"] - before["Total(Qty)"], 5)
        self.assertEqual(after["Total(Amt)"] - before["Total(Amt)"], 1000)

    def test_based_on_territory(self):
        territory = frappe.db.get_value("Customer", CUSTOMER, "territory")
        cols = ["Total(Qty)", "Total(Amt)"]
        before = self.values({"Territory": territory}, cols, based_on="Territory")
        self.deliver(customer=CUSTOMER)
        after = self.values({"Territory": territory}, cols, based_on="Territory")
        self.assertEqual(after["Total(Qty)"] - before["Total(Qty)"], 5)
        self.assertEqual(after["Total(Amt)"] - before["Total(Amt)"], 1000)

    def test_group_by_item_under_customer(self):
        cols = ["Total(Qty)", "Total(Amt)"]
        before = self.values({"Item": ITEM}, cols, based_on="Customer", group_by="Item")
        self.deliver(customer=CUSTOMER)
        after = self.values({"Item": ITEM}, cols, based_on="Customer", group_by="Item")
        self.assertEqual(after["Total(Qty)"] - before["Total(Qty)"], 5)
        self.assertEqual(after["Total(Amt)"] - before["Total(Amt)"], 1000)
