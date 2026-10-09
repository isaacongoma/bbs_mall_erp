import frappe
from frappe.utils import add_days, getdate, today

from erpnext.stock.doctype.item.test_item import make_item
from erpnext.stock.doctype.purchase_receipt.test_purchase_receipt import make_purchase_receipt
from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
from erpnext.stock.doctype.warehouse.test_warehouse import create_warehouse
from erpnext.stock.doctype.warehouse.warehouse import get_warehouses_based_on_account
from erpnext.stock.report.stock_and_account_value_comparison.stock_and_account_value_comparison import (
    create_gl_reposting_entries,
    create_reposting_entries,
    execute,
)
from erpnext.tests.utils import ERPNextTestSuite

COMPANY = "_Test Company with perpetual inventory"
PI_STORES = "Stores - TCP1"


class TestStockAndAccountValueComparison(ERPNextTestSuite):
    def test_balanced_warehouse_not_flagged(self):
        warehouse = create_warehouse("_Test SAVC WH", company=COMPANY)
        account = frappe.get_value("Warehouse", warehouse, "account")
        item = "_Test Item"

        make_stock_entry(
            item_code=item,
            to_warehouse=warehouse,
            qty=10,
            rate=100,
            company=COMPANY,
            posting_date="2026-06-01",
        )

        rows = self.run_report(account=account)

        self.assertEqual(rows, [])

    def test_stock_account_gl_mismatch_is_flagged(self):
        warehouse = create_warehouse("_Test SAVC Mismatch WH", company=COMPANY)
        account = frappe.get_value("Warehouse", warehouse, "account")

        receipt = make_stock_entry(
            item_code="_Test Item",
            to_warehouse=warehouse,
            qty=10,
            rate=100,
            company=COMPANY,
            posting_date="2026-06-01",
        )

        frappe.db.set_value(
            "GL Entry",
            {"voucher_no": receipt.name, "account": account, "is_cancelled": 0},
            "debit_in_account_currency",
            600,
            update_modified=False,
        )

        rows = self.run_report(account=account)

        row = next((r for r in rows if r["voucher_no"] == receipt.name), None)
        self.assertIsNotNone(row, "Tampered GL entry should cause the voucher to appear in the report")
        self.assertEqual(row["ledger_type"], "Stock Ledger Entry")
        self.assertEqual(row["stock_value"], 1000)
        self.assertEqual(row["account_value"], 600)
        self.assertEqual(row["difference_value"], 400)

    def test_purchase_voucher_reposted_transaction_based(self):
        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)

        frappe.db.delete("GL Entry", {"voucher_type": "Purchase Receipt", "voucher_no": pr.name})

        filters = frappe._dict(company=COMPANY, as_on_date=today())
        _columns, data = execute(filters)

        row = next((d for d in data if d.get("voucher_no") == pr.name), None)
        self.assertIsNotNone(row, "Out-of-sync Purchase Receipt should appear in the report")
        self.assertEqual(row.get("voucher_type"), "Purchase Receipt")

        create_reposting_entries([row], COMPANY)

        transaction_rivs = frappe.get_all(
            "Repost Item Valuation",
            filters={"voucher_no": pr.name, "voucher_type": "Purchase Receipt"},
            fields=["name", "based_on"],
        )

        self.assertTrue(transaction_rivs, "Expected a Repost Item Valuation for the Purchase Receipt")
        self.assertTrue(all(riv.based_on == "Transaction" for riv in transaction_rivs))

        item_wh_rivs = frappe.get_all(
            "Repost Item Valuation",
            filters={"based_on": "Item and Warehouse", "item_code": item},
        )
        self.assertFalse(item_wh_rivs, "Purchase vouchers must not be reposted Item-and-Warehouse based")

    def test_child_account_override_excluded_from_group_account(self):
        group = create_warehouse("_Test SAVC Group WH", {"is_group": 1}, company=COMPANY)
        group_account = frappe.get_value("Warehouse", group, "account")

        inheriting = create_warehouse(
            "_Test SAVC Inherit WH", {"parent_warehouse": group, "account": group_account}, company=COMPANY
        )
        overriding = create_warehouse("_Test SAVC Transit WH", {"parent_warehouse": group}, company=COMPANY)

        warehouses = get_warehouses_based_on_account(group_account, COMPANY)

        self.assertIn(inheriting, warehouses)
        self.assertNotIn(overriding, warehouses)

    def test_gl_reposting_only_repost_accounting_ledgers(self):
        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)

        frappe.db.delete("GL Entry", {"voucher_type": "Purchase Receipt", "voucher_no": pr.name})

        filters = frappe._dict(company=COMPANY, as_on_date=today())
        _columns, data = execute(filters)

        row = next((d for d in data if d.get("voucher_no") == pr.name), None)
        self.assertIsNotNone(row, "Out-of-sync Purchase Receipt should appear in the report")

        create_gl_reposting_entries([row], COMPANY)

        rivs = frappe.get_all(
            "Repost Item Valuation",
            filters={"voucher_no": pr.name, "voucher_type": "Purchase Receipt"},
            fields=["name", "based_on", "repost_only_accounting_ledgers"],
        )

        self.assertEqual(len(rivs), 1)
        self.assertEqual(rivs[0].based_on, "Transaction")
        self.assertTrue(rivs[0].repost_only_accounting_ledgers)

        self.assertTrue(
            frappe.db.exists("GL Entry", {"voucher_type": "Purchase Receipt", "voucher_no": pr.name})
        )

    def test_gl_reposting_skips_already_queued_voucher(self):
        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)

        row = {
            "ledger_type": "Stock Ledger Entry",
            "voucher_type": "Purchase Receipt",
            "voucher_no": pr.name,
            "posting_date": pr.posting_date,
            "posting_time": pr.posting_time,
        }

        frappe.flags.dont_execute_stock_reposts = True
        try:
            create_gl_reposting_entries([row, dict(row)], COMPANY)
            create_gl_reposting_entries([row], COMPANY)
        finally:
            frappe.flags.dont_execute_stock_reposts = False

        rivs = frappe.get_all(
            "Repost Item Valuation",
            filters={
                "voucher_no": pr.name,
                "voucher_type": "Purchase Receipt",
                "repost_only_accounting_ledgers": 1,
            },
        )

        self.assertEqual(len(rivs), 1)

    def test_gl_reposting_skips_journal_entry_rows(self):
        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)
        frappe.db.delete("GL Entry", {"voucher_type": "Purchase Receipt", "voucher_no": pr.name})

        filters = frappe._dict(company=COMPANY, as_on_date=today())
        _columns, data = execute(filters)
        pr_row = next((d for d in data if d.get("voucher_no") == pr.name), None)

        journal_row = {
            "ledger_type": "GL Entry",
            "voucher_type": "Journal Entry",
            "voucher_no": "_Test JE for GL Reposting",
            "posting_date": today(),
        }

        create_gl_reposting_entries([journal_row, pr_row], COMPANY)

        self.assertFalse(
            frappe.db.exists("Repost Item Valuation", {"voucher_type": "Journal Entry"}),
            "Journal Entry rows must be skipped",
        )
        self.assertTrue(frappe.db.exists("Repost Item Valuation", {"voucher_no": pr.name}))

    def test_report_from_date_filter(self):
        warehouse = create_warehouse("_Test SAVC From Date WH", company=COMPANY)
        account = frappe.get_value("Warehouse", warehouse, "account")

        receipts = []
        for posting_date in ("2026-05-01", "2026-06-01"):
            receipt = make_stock_entry(
                item_code="_Test Item",
                to_warehouse=warehouse,
                qty=10,
                rate=100,
                company=COMPANY,
                posting_date=posting_date,
            )
            frappe.db.set_value(
                "GL Entry",
                {"voucher_no": receipt.name, "account": account, "is_cancelled": 0},
                "debit_in_account_currency",
                600,
                update_modified=False,
            )
            receipts.append(receipt.name)

        vouchers = {r["voucher_no"] for r in self.run_report(account=account, from_date="2026-05-15")}

        self.assertNotIn(receipts[0], vouchers)
        self.assertIn(receipts[1], vouchers)

    def test_gl_reposting_rejects_rows_in_closed_accounting_period(self):
        from erpnext.accounts.doctype.accounting_period.test_accounting_period import (
            create_accounting_period,
        )

        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        old_pr = make_purchase_receipt(
            item_code=item,
            company=COMPANY,
            warehouse=PI_STORES,
            qty=5,
            rate=100,
            posting_date=add_days(today(), -10),
        )
        new_pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)

        period = create_accounting_period(
            start_date=add_days(today(), -12),
            end_date=add_days(today(), -8),
            company=COMPANY,
            period_name="_Test SAVC Closed Period",
        )
        period.closed_documents = []
        period.append("closed_documents", {"document_type": "Purchase Receipt", "closed": 1})
        period.insert()

        rows = [
            {
                "ledger_type": "Stock Ledger Entry",
                "voucher_type": "Purchase Receipt",
                "voucher_no": pr.name,
                "posting_date": pr.posting_date,
                "posting_time": pr.posting_time,
            }
            for pr in (old_pr, new_pr)
        ]

        frappe.flags.dont_execute_stock_reposts = True
        try:
            self.assertRaises(frappe.ValidationError, create_gl_reposting_entries, rows, COMPANY)
        finally:
            frappe.flags.dont_execute_stock_reposts = False

        self.assertFalse(
            frappe.db.exists("Repost Item Valuation", {"voucher_no": ("in", [old_pr.name, new_pr.name])})
        )

    def test_gl_reposting_skips_gl_only_rows(self):
        row = {
            "ledger_type": "GL Entry",
            "voucher_type": "Payment Entry",
            "voucher_no": "_Test PE for GL Reposting",
            "posting_date": today(),
        }

        create_gl_reposting_entries([row], COMPANY)

        self.assertFalse(frappe.db.exists("Repost Item Valuation", {"voucher_no": row["voucher_no"]}))

    def test_gl_reposting_uses_voucher_posting_date(self):
        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        old_pr = make_purchase_receipt(
            item_code=item,
            company=COMPANY,
            warehouse=PI_STORES,
            qty=5,
            rate=100,
            posting_date=add_days(today(), -10),
        )

        row = {
            "ledger_type": "Stock Ledger Entry",
            "voucher_type": "Purchase Receipt",
            "voucher_no": old_pr.name,
            "posting_date": today(),
            "posting_time": old_pr.posting_time,
        }

        frappe.flags.dont_execute_stock_reposts = True
        try:
            create_gl_reposting_entries([row], COMPANY)
        finally:
            frappe.flags.dont_execute_stock_reposts = False

        posting_date = frappe.db.get_value(
            "Repost Item Valuation", {"voucher_no": old_pr.name}, "posting_date"
        )
        self.assertEqual(getdate(posting_date), getdate(old_pr.posting_date))

    def test_gl_reposting_requires_accounts_manager(self):
        from frappe.core.doctype.user_permission.test_user_permission import create_user
        from frappe.desk.query_report import run

        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name
        pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)

        row = {
            "ledger_type": "Stock Ledger Entry",
            "voucher_type": "Purchase Receipt",
            "voucher_no": pr.name,
            "posting_date": pr.posting_date,
            "posting_time": pr.posting_time,
        }

        stock_manager = create_user("test_savc_stock_manager@example.com", "Stock User", "Stock Manager")
        accounts_user = create_user(
            "test_savc_accounts_stock_user@example.com", "Accounts User", "Stock User"
        )
        accounts_manager = create_user("test_savc_accounts_manager@example.com", "Accounts Manager")

        frappe.flags.dont_execute_stock_reposts = True
        try:
            for user in (stock_manager, accounts_user):
                with self.set_user(user.name):
                    self.assertRaises(frappe.PermissionError, create_gl_reposting_entries, [row], COMPANY)

            self.assertFalse(frappe.db.exists("Repost Item Valuation", {"voucher_no": pr.name}))

            with self.set_user(accounts_manager.name):
                run("Stock and Account Value Comparison", {"company": COMPANY, "as_on_date": today()})
                create_gl_reposting_entries([row], COMPANY)
        finally:
            frappe.flags.dont_execute_stock_reposts = False

        self.assertTrue(
            frappe.db.exists(
                "Repost Item Valuation", {"voucher_no": pr.name, "repost_only_accounting_ledgers": 1}
            )
        )

    def test_gl_reposting_skips_rows_before_optional_from_date(self):
        item = make_item(properties={"is_stock_item": 1, "valuation_method": "FIFO"}).name

        old_pr = make_purchase_receipt(
            item_code=item,
            company=COMPANY,
            warehouse=PI_STORES,
            qty=5,
            rate=100,
            posting_date=add_days(today(), -10),
        )
        new_pr = make_purchase_receipt(item_code=item, company=COMPANY, warehouse=PI_STORES, qty=5, rate=100)

        rows = [
            {
                "ledger_type": "Stock Ledger Entry",
                "voucher_type": "Purchase Receipt",
                "voucher_no": pr.name,
                "posting_date": pr.posting_date,
                "posting_time": pr.posting_time,
            }
            for pr in (old_pr, new_pr)
        ]

        frappe.flags.dont_execute_stock_reposts = True
        try:
            create_gl_reposting_entries(rows, COMPANY, from_date=add_days(today(), -1))
        finally:
            frappe.flags.dont_execute_stock_reposts = False

        self.assertFalse(frappe.db.exists("Repost Item Valuation", {"voucher_no": old_pr.name}))
        self.assertTrue(frappe.db.exists("Repost Item Valuation", {"voucher_no": new_pr.name}))

    def test_gl_reposting_not_allowed_against_gl_entry_voucher_type(self):
        riv = frappe.new_doc("Repost Item Valuation")
        riv.update(
            {
                "based_on": "Transaction",
                "voucher_type": "GL Entry",
                "voucher_no": "some-gl-entry",
                "posting_date": today(),
                "company": COMPANY,
                "repost_only_accounting_ledgers": 1,
            }
        )

        self.assertRaises(frappe.ValidationError, riv.validate_repost_only_accounting_ledgers)

        riv.repost_only_accounting_ledgers = 0
        riv.validate_repost_only_accounting_ledgers()

    def run_report(self, **extra):
        filters = {"company": COMPANY, "as_on_date": "2026-12-31"}
        filters.update(extra)
        return execute(frappe._dict(filters))[1]
