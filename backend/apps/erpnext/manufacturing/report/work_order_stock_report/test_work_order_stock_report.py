import frappe

from erpnext.tests.utils import ERPNextTestSuite


class TestWorkOrderStockReport(ERPNextTestSuite):
    def test_report_executes_and_lists_work_order(self):
        from erpnext.manufacturing.doctype.work_order.test_work_order import make_wo_order_test_record
        from erpnext.manufacturing.report.work_order_stock_report.work_order_stock_report import execute

        wo = make_wo_order_test_record(
            production_item="_Test FG Item", qty=1, source_warehouse="_Test Warehouse - _TC"
        )

        columns, data = execute(frappe._dict(warehouse="_Test Warehouse - _TC"))

        self.assertTrue(columns)
        self.assertIn(wo.name, {row["work_order"] for row in data})

    def test_item_listed_twice_in_bom_is_counted_once(self):
        from erpnext.manufacturing.doctype.production_plan.test_production_plan import make_bom
        from erpnext.manufacturing.doctype.work_order.test_work_order import make_wo_order_test_record
        from erpnext.manufacturing.report.work_order_stock_report.work_order_stock_report import execute
        from erpnext.stock.doctype.item.test_item import make_item

        fg_item = make_item("_Test WO Stock Dup FG", {"is_stock_item": 1}).name
        rm_item = "_Test Item"

        bom = make_bom(item=fg_item, raw_materials=[rm_item], rm_qty=1, currency="INR", do_not_save=True)
        first = bom.items[0]
        bom.append(
            "items",
            {
                "item_code": rm_item,
                "qty": 2,
                "uom": first.uom,
                "stock_uom": first.stock_uom,
                "rate": first.rate,
            },
        )
        bom.insert(ignore_permissions=True)
        bom.submit()

        wo = make_wo_order_test_record(
            production_item=fg_item,
            bom_no=bom.name,
            qty=1,
            source_warehouse="_Test Warehouse - _TC",
            skip_transfer=1,
        )

        columns, data = execute(frappe._dict(warehouse="_Test Warehouse - _TC"))

        wo_rows = [row for row in data if row["work_order"] == wo.name]
        self.assertTrue(wo_rows)
        for row in wo_rows:
            self.assertEqual(row["req_items"], 1)
