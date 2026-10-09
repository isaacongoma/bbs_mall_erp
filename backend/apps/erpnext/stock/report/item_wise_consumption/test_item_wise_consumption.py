import frappe

from erpnext.stock.doctype.delivery_note.test_delivery_note import create_delivery_note
from erpnext.stock.doctype.item.test_item import make_item
from erpnext.stock.doctype.purchase_receipt.test_purchase_receipt import make_purchase_receipt
from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
from erpnext.stock.report.item_wise_consumption.item_wise_consumption import execute
from erpnext.tests.utils import ERPNextTestSuite

WH = "Stores - _TC"


class TestItemWiseConsumption(ERPNextTestSuite):
    def run_report(self, **extra):
        filters = frappe._dict(
            {"company": "_Test Company", "from_date": "2026-01-01", "to_date": "2026-12-31", **extra}
        )
        return execute(filters)[1]

    def test_consumed_vs_delivered_split(self):
        item = make_item(properties={"is_stock_item": 1}).name
        make_purchase_receipt(
            item_code=item,
            qty=10,
            rate=100,
            warehouse=WH,
            supplier="_Test Supplier",
            posting_date="2026-06-01",
        )
        make_stock_entry(item_code=item, from_warehouse=WH, qty=4, posting_date="2026-06-02")
        create_delivery_note(item_code=item, qty=3, warehouse=WH, posting_date="2026-06-03")

        row = next(r for r in self.run_report() if r[0] == item)
        self.assertEqual(row[4], 4)
        self.assertEqual(row[5], 400)
        self.assertEqual(row[6], 3)
        self.assertEqual(row[7], 300)
        self.assertEqual(row[8], 7)
        self.assertEqual(row[9], 700)
        self.assertEqual(row[9], row[5] + row[7])
        self.assertIn("_Test Supplier", row[10])
