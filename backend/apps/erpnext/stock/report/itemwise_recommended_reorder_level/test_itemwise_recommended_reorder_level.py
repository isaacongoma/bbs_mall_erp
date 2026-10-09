import frappe
from frappe.utils import flt

from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
from erpnext.stock.report.itemwise_recommended_reorder_level.itemwise_recommended_reorder_level import (
    execute,
)
from erpnext.tests.utils import ERPNextTestSuite

WAREHOUSE = "Stores - _TC"


class TestItemwiseRecommendedReorderLevel(ERPNextTestSuite):
    def run_report(self, **extra):
        filters = frappe._dict({"from_date": "2026-06-01", "to_date": "2026-06-10"})
        filters.update(extra)
        return execute(filters)[1]

    def find_row(self, data, item_code):
        for row in data:
            if row[0] == item_code:
                return row
        return None

    def test_consumption_drives_recommendation(self):
        item = "_Test Item"
        frappe.db.set_value("Item", item, {"lead_time_days": 3, "safety_stock": 5})

        make_stock_entry(item_code=item, to_warehouse=WAREHOUSE, qty=100, rate=10, posting_date="2026-06-01")
        make_stock_entry(item_code=item, from_warehouse=WAREHOUSE, qty=20, posting_date="2026-06-03")
        make_stock_entry(item_code=item, from_warehouse=WAREHOUSE, qty=30, posting_date="2026-06-07")

        data = self.run_report(item_group="All Item Groups")
        row = self.find_row(data, item)
        self.assertIsNotNone(row, msg=f"Item {item} not found in report")

        float_precision = frappe.db.get_default("float_precision")
        diff = 10
        total_outgoing = 50.0
        expected_avg = flt(total_outgoing / diff, float_precision)
        expected_reorder = (expected_avg * 3) + 5

        self.assertEqual(flt(row[7]), total_outgoing)
        self.assertEqual(flt(row[8]), 0.0)
        self.assertEqual(flt(row[9]), total_outgoing)
        self.assertEqual(flt(row[10]), expected_avg)
        self.assertEqual(flt(row[11]), expected_reorder)

    def test_no_consumption_yields_zero_outgoing(self):
        item = "_Test Item 2"
        frappe.db.set_value("Item", item, {"lead_time_days": 3, "safety_stock": 5})
        make_stock_entry(item_code=item, to_warehouse=WAREHOUSE, qty=100, rate=10, posting_date="2026-06-01")

        row = self.find_row(self.run_report(), item)
        self.assertIsNotNone(row)
        self.assertEqual(flt(row[9]), 0.0)
        self.assertEqual(flt(row[10]), 0.0)
        self.assertEqual(flt(row[11]), 5.0)
