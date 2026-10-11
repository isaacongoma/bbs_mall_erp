import frappe
from frappe.utils import add_days, flt, getdate, today

from apps.bbs_marketplace.marketplace import wallet
from apps.bbs_marketplace.tests.base import MarketplaceTestCase


class TestOrdersAndWallet(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_seller()
        self.buyer = self.make_customer("MKT Buyer")
        self.listing = self.make_listing(self.seller, price=1160)

    def delivered_order(self, qty=2):
        order = self.place_order(self.buyer, self.listing, qty)
        self.pay(order)
        seller_order = frappe.get_doc("Seller Order", {"marketplace_order": order.name})
        seller_order.accept()
        seller_order.mark_packed()
        seller_order.mark_shipped("TRK1")
        seller_order.mark_delivered()
        return order.name, seller_order.name

    def test_seller_setup_creates_wallet_supplier_and_warehouse(self):
        doc = frappe.get_doc("Marketplace Seller", self.seller)
        self.assertTrue(doc.supplier)
        self.assertTrue(doc.warehouse)
        self.assertEqual(frappe.db.get_value("Customer", doc.customer, "marketplace_seller"), self.seller)

    def test_order_pricing_extracts_vat(self):
        order = self.place_order(self.buyer, self.listing, 2)
        self.assertEqual(flt(order.items[0].amount), 2320)
        self.assertEqual(flt(order.items[0].vat_amount), 320)
        self.assertEqual(flt(order.subtotal), 2000)
        self.assertEqual(flt(order.grand_total), 2320 + flt(order.shipping_total))
        self.assertEqual(flt(order.shipping_total), 200)

    def test_stock_is_reserved_on_placement(self):
        self.place_order(self.buyer, self.listing, 3)
        self.assertEqual(flt(frappe.db.get_value("Marketplace Listing", self.listing, "reserved_qty")), 3)
        self.assertEqual(flt(frappe.db.get_value("Marketplace Listing", self.listing, "available_qty")), 47)

    def test_cannot_oversell(self):
        with self.assertRaises(frappe.ValidationError):
            self.place_order(self.buyer, self.listing, 500)

    def test_payment_confirms_order_and_books_a_balanced_receipt(self):
        order = self.place_order(self.buyer, self.listing, 1)
        self.assertEqual(order.status, "Pending Payment")
        payment = self.pay(order)
        order.reload()
        self.assertEqual(order.payment_status, "Paid")
        self.assertEqual(order.status, "Processing")
        debit, credit = self.gl_total(payment.reload() and frappe.db.get_value("Marketplace Payment", payment.name, "payment_entry"))
        self.assertEqual(debit, credit)
        self.assertEqual(debit, flt(order.grand_total))
        self.assertEqual(len(frappe.get_all("Seller Order", filters={"marketplace_order": order.name})), 1)

    def test_settlement_posts_commission_vat_and_seller_net(self):
        order_name, so_name = self.delivered_order(2)
        so = frappe.get_doc("Seller Order", so_name)
        self.assertEqual(flt(so.commission_amount), 200)
        self.assertEqual(flt(so.commission_vat), 32)
        self.assertEqual(flt(so.seller_net), flt(2320 - 200 - 32))
        debit, credit = self.gl_total(so.journal_entry)
        self.assertEqual(debit, credit)
        balances = wallet.balances(self.seller)
        self.assertEqual(balances["balance"], 2088)
        self.assertEqual(balances["pending"], 2088)
        self.assertEqual(balances["available"], 0)
        income = frappe.db.sql(
            'select coalesce(sum(credit - debit),0) from "tabGL Entry" where voucher_no = %s and account = %s and is_cancelled = 0',
            (so.journal_entry, self.settings.commission_income_account),
        )[0][0]
        self.assertEqual(flt(income), 200)

    def test_hold_releases_after_return_window(self):
        self.delivered_order(1)
        self.assertEqual(wallet.balances(self.seller)["available"], 0)
        released = wallet.release_due_holds(add_days(today(), 8))
        self.assertGreaterEqual(released, 1)
        values = wallet.balances(self.seller)
        self.assertEqual(values["available"], values["balance"])
        self.assertGreater(values["available"], 0)

    def test_withdrawal_needs_available_balance_and_reserves_funds(self):
        self.delivered_order(2)
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Seller Withdrawal", "seller": self.seller, "amount": 1000, "method": "M-Pesa"}).insert()
        wallet.release_due_holds(add_days(today(), 8))
        before = wallet.balances(self.seller)["available"]
        withdrawal = frappe.get_doc({"doctype": "Seller Withdrawal", "seller": self.seller, "amount": 1000, "method": "M-Pesa"}).insert()
        self.assertEqual(withdrawal.status, "Pending Approval")
        self.assertEqual(wallet.balances(self.seller)["available"], flt(before - 1000, 2))
        debit, credit = self.gl_total(withdrawal.hold_journal)
        self.assertEqual(debit, credit)
        withdrawal.mark_paid(receipt_no="QWE123")
        self.assertEqual(withdrawal.status, "Paid")
        self.assertEqual(wallet.balances(self.seller)["balance"], flt(before - 1000, 2))

    def test_failed_withdrawal_returns_funds(self):
        self.delivered_order(2)
        wallet.release_due_holds(add_days(today(), 8))
        before = wallet.balances(self.seller)["available"]
        withdrawal = frappe.get_doc({"doctype": "Seller Withdrawal", "seller": self.seller, "amount": 800, "method": "M-Pesa"}).insert()
        withdrawal.mark_failed("Insufficient float")
        self.assertEqual(wallet.balances(self.seller)["available"], before)

    def test_wallet_pays_tenant_invoice(self):
        self.delivered_order(2)
        wallet.release_due_holds(add_days(today(), 8))
        customer = frappe.db.get_value("Marketplace Seller", self.seller, "customer")
        invoice = frappe.get_doc(
            {
                "doctype": "Sales Invoice",
                "customer": customer,
                "company": "_Test Company",
                "posting_date": today(),
                "due_date": today(),
                "currency": frappe.get_cached_value("Company", "_Test Company", "default_currency"),
                "debit_to": frappe.get_cached_value("Company", "_Test Company", "default_receivable_account"),
                "items": [{"item_code": self.make_item("MKT-RENT"), "qty": 1, "rate": 1500, "income_account": "Sales - _TC", "cost_center": "Main - _TC"}],
            }
        ).insert()
        invoice.submit()
        before = wallet.balances(self.seller)["available"]
        bill = frappe.get_doc(
            {
                "doctype": "Wallet Bill Payment",
                "seller": self.seller,
                "company": "_Test Company",
                "invoices": [{"sales_invoice": invoice.name, "allocated_amount": 1500}],
            }
        ).insert()
        bill.submit()
        self.assertEqual(flt(frappe.db.get_value("Sales Invoice", invoice.name, "outstanding_amount")), 0)
        self.assertEqual(wallet.balances(self.seller)["available"], flt(before - 1500, 2))
        bill.cancel()
        self.assertEqual(flt(frappe.db.get_value("Sales Invoice", invoice.name, "outstanding_amount")), 1500)

    def test_return_reverses_commission_and_refunds_buyer(self):
        order_name, so_name = self.delivered_order(2)
        before = wallet.balances(self.seller)["balance"]
        so = frappe.get_doc("Seller Order", so_name)
        request = frappe.get_doc(
            {
                "doctype": "Return Request",
                "marketplace_order": order_name,
                "seller_order": so_name,
                "reason": "Faulty",
                "items": [{"order_item": so.items[0].name, "qty": 1, "restock": 1}],
            }
        ).insert()
        self.assertEqual(flt(request.refund_amount), 1160)
        request.decide(True)
        request.receive()
        request.refund()
        self.assertEqual(request.status, "Refunded")
        after = wallet.balances(self.seller)["balance"]
        self.assertEqual(flt(before - after, 2), flt(1160 - 100 - 16, 2))
        debit, credit = self.gl_total(request.reverse_journal)
        self.assertEqual(debit, credit)

    def test_cancel_unshipped_order_refunds_and_releases_stock(self):
        order = self.place_order(self.buyer, self.listing, 2)
        self.pay(order)
        from apps.bbs_marketplace.marketplace import orders

        orders.cancel_order(order.name, "Changed my mind")
        order.reload()
        self.assertEqual(order.status, "Cancelled")
        self.assertEqual(flt(frappe.db.get_value("Marketplace Listing", self.listing, "reserved_qty")), 0)

    def test_commission_rule_priority(self):
        group = frappe.db.get_value("Marketplace Listing", self.listing, "item_group")
        frappe.get_doc({"doctype": "Commission Rule", "title": "Group 5", "applies_to": "Category", "item_group": group, "rate_percent": 5, "priority": 20}).insert()
        from apps.bbs_marketplace.marketplace import commission

        terms = commission.resolve(self.seller, group, None, "B2C")
        self.assertEqual(terms["rate"], 5)
        frappe.db.set_value("Marketplace Seller", self.seller, "commission_override", 3)
        self.assertEqual(commission.resolve(self.seller, group, None, "B2C")["rate"], 3)
