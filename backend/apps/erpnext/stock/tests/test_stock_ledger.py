import frappe

from erpnext.tests.utils import ERPNextTestSuite


class TestStockLedgerConversions(ERPNextTestSuite):
    """Exercises the stock_ledger.py raw-SQL -> query-builder conversions on both engines."""

    def test_set_as_cancel_marks_entries_cancelled(self):
        from erpnext.stock.doctype.item.test_item import make_item
        from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry

        item = make_item("_Test SL Cancel Item", {"is_stock_item": 1}).name
        se = make_stock_entry(item_code=item, target="_Test Warehouse - _TC", qty=5, basic_rate=100)

        self.assertTrue(frappe.db.exists("Stock Ledger Entry", {"voucher_no": se.name, "is_cancelled": 0}))

        se.cancel()

        self.assertFalse(frappe.db.exists("Stock Ledger Entry", {"voucher_no": se.name, "is_cancelled": 0}))
        self.assertTrue(frappe.db.exists("Stock Ledger Entry", {"voucher_no": se.name, "is_cancelled": 1}))

    def test_get_valuation_rate_returns_last_sle_rate(self):
        from erpnext.stock.doctype.item.test_item import make_item
        from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
        from erpnext.stock.stock_ledger import get_valuation_rate

        item = make_item("_Test SL Valuation Item", {"is_stock_item": 1}).name
        make_stock_entry(item_code=item, target="_Test Warehouse - _TC", qty=10, basic_rate=250)

        rate = get_valuation_rate(item, "_Test Warehouse - _TC", "Stock Entry", "_TEST-NO-SUCH-VOUCHER")
        self.assertEqual(rate, 250)

    def test_get_future_sle_with_negative_qty_runs(self):
        from frappe.utils import now_datetime

        from erpnext.stock.stock_ledger import get_future_sle_with_negative_qty

        args = {
            "item_code": "_Test Item",
            "warehouse": "_Test Warehouse - _TC",
            "voucher_no": "_TEST-NO-SUCH-VOUCHER",
            "posting_datetime": now_datetime(),
        }
        self.assertIsInstance(get_future_sle_with_negative_qty(args), list | tuple)
