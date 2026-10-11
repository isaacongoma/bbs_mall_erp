import frappe
from frappe.utils import add_days, flt, today

from apps.bbs_marketplace.marketplace import seller_portal, wallet
from apps.bbs_marketplace.tests.base import COMPANY, MarketplaceTestCase

SELLER_USER = "shop.owner@example.com"


class TestSellerPortal(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_seller("Portal Shop")
        self.customer = frappe.db.get_value("Marketplace Seller", self.seller, "customer")
        if not frappe.db.exists("User", SELLER_USER):
            frappe.get_doc({"doctype": "User", "email": SELLER_USER, "first_name": "Shop", "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True)
        customer = frappe.get_doc("Customer", self.customer)
        if not any(row.user == SELLER_USER for row in customer.get("tenant_portal_users") or []):
            customer.append("tenant_portal_users", {"user": SELLER_USER, "access_level": "Owner"})
            customer.save(ignore_permissions=True)
        self.buyer = self.make_customer("Portal Buyer")
        frappe.set_user(SELLER_USER)

    def tearDown(self):
        frappe.set_user("Administrator")
        super().tearDown()

    def as_admin(self, function, *args, **kwargs):
        frappe.set_user("Administrator")
        try:
            return function(*args, **kwargs)
        finally:
            frappe.set_user(SELLER_USER)

    def listing_values(self, **extra):
        return {
            "listing_title": "Portal Kettle",
            "listing_type": "Both",
            "item_group": "All Item Groups",
            "price": 1160,
            "vat_rate": 16,
            "price_includes_vat": 1,
            "stock_qty": 20,
            "weight_kg": 1,
            **extra,
        }

    def test_context_reports_the_seller(self):
        context = seller_portal.get_seller_context()
        self.assertEqual(context["seller"]["name"], self.seller)
        self.assertEqual(context["seller"]["status"], "Active")

    def test_listing_lifecycle_needs_photo_then_moderation(self):
        name = seller_portal.save_listing(self.listing_values())
        self.assertEqual(frappe.db.get_value("Marketplace Listing", name, "status"), "Draft")
        item = frappe.db.get_value("Marketplace Listing", name, "item")
        self.assertEqual(frappe.db.get_value("Item", item, "marketplace_seller"), self.seller)
        with self.assertRaises(frappe.ValidationError):
            seller_portal.submit_listing(name)
        seller_portal.save_listing(self.listing_values(images=[{"image": "/files/kettle.png", "is_primary": 1}]), name)
        self.assertEqual(seller_portal.submit_listing(name), "Pending Approval")
        with self.assertRaises(frappe.ValidationError):
            seller_portal.resume_listing(name)
        self.as_admin(lambda: frappe.get_doc("Marketplace Listing", name).set_status("Approved"))
        self.assertEqual(seller_portal.resume_listing(name), "Published")
        self.assertEqual(seller_portal.pause_listing(name), "Paused")
        rows = seller_portal.get_listings(status="Paused")["rows"]
        self.assertEqual([row.name for row in rows], [name])

    def test_cannot_touch_another_sellers_listing(self):
        other = self.as_admin(self.make_seller, "Other Shop")
        other_listing = self.as_admin(self.make_listing, other, "MKT-OTHER-1")
        with self.assertRaises(frappe.PermissionError):
            seller_portal.get_listing(other_listing)
        with self.assertRaises(frappe.PermissionError):
            seller_portal.pause_listing(other_listing)

    def test_seller_fulfils_order_and_wallet_is_credited(self):
        listing = self.as_admin(self.make_listing, self.seller, "MKT-PORTAL-1")
        order = self.as_admin(self.place_order, self.buyer, listing, 2)
        self.as_admin(self.pay, order)
        seller_order = frappe.db.get_value("Seller Order", {"marketplace_order": order.name})
        self.assertEqual(seller_portal.get_orders(status="New")["rows"][0].name, seller_order)
        self.assertEqual(seller_portal.order_action(seller_order, "accept"), "Accepted")
        self.assertEqual(seller_portal.order_action(seller_order, "pack"), "Packed")
        self.assertEqual(seller_portal.order_action(seller_order, "ship", tracking_no="TRK-9"), "Shipped")
        with self.assertRaises(frappe.ValidationError):
            seller_portal.order_action(seller_order, "accept")
        self.assertEqual(seller_portal.order_action(seller_order, "deliver"), "Delivered")
        detail = seller_portal.get_order(seller_order)
        self.assertEqual(flt(detail["order"]["seller_net"]), 2088)
        self.assertEqual(flt(seller_portal.get_wallet()["balances"]["balance"]), 2088)

    def test_withdrawal_needs_verified_payout_account(self):
        listing = self.as_admin(self.make_listing, self.seller, "MKT-PORTAL-2")
        order = self.as_admin(self.place_order, self.buyer, listing, 2)
        self.as_admin(self.pay, order)
        seller_order = frappe.db.get_value("Seller Order", {"marketplace_order": order.name})
        for action in ("accept", "pack", "ship", "deliver"):
            seller_portal.order_action(seller_order, action)
        self.as_admin(wallet.release_due_holds, add_days(today(), 8))
        accounts = seller_portal.add_payout_account("M-Pesa", mpesa_number="0722000111", account_holder="Shop Owner")
        self.assertFalse(accounts[-1]["verified"])
        with self.assertRaises(frappe.ValidationError):
            seller_portal.request_withdrawal(1000, accounts[-1]["name"])

        def verify():
            doc = frappe.get_doc("Marketplace Seller", self.seller)
            for row in doc.payout_accounts:
                row.verified = 1
            doc.save(ignore_permissions=True)

        self.as_admin(verify)
        result = seller_portal.request_withdrawal(1000, accounts[-1]["name"])
        self.assertEqual(result["status"], "Pending Approval")
        self.assertEqual(flt(seller_portal.get_wallet()["balances"]["available"]), flt(2088 - 1000, 2))
        self.assertEqual(len(seller_portal.get_withdrawals()), 1)

    def test_wallet_pays_own_bills_only(self):
        listing = self.as_admin(self.make_listing, self.seller, "MKT-PORTAL-3")
        order = self.as_admin(self.place_order, self.buyer, listing, 2)
        self.as_admin(self.pay, order)
        seller_order = frappe.db.get_value("Seller Order", {"marketplace_order": order.name})
        for action in ("accept", "pack", "ship", "deliver"):
            seller_portal.order_action(seller_order, action)
        self.as_admin(wallet.release_due_holds, add_days(today(), 8))

        def invoice(customer):
            doc = frappe.get_doc(
                {
                    "doctype": "Sales Invoice",
                    "customer": customer,
                    "company": COMPANY,
                    "posting_date": today(),
                    "due_date": today(),
                    "currency": frappe.get_cached_value("Company", COMPANY, "default_currency"),
                    "debit_to": frappe.get_cached_value("Company", COMPANY, "default_receivable_account"),
                    "items": [{"item_code": self.make_item("MKT-RENT-P"), "qty": 1, "rate": 900, "income_account": "Sales - _TC", "cost_center": "Main - _TC"}],
                }
            ).insert(ignore_permissions=True)
            doc.submit()
            return doc.name

        mine = self.as_admin(invoice, self.customer)
        theirs = self.as_admin(invoice, self.buyer)
        bills = seller_portal.get_open_bills()
        self.assertEqual([row.name for row in bills["invoices"]], [mine])
        with self.assertRaises(frappe.ValidationError):
            seller_portal.pay_bills([{"sales_invoice": theirs, "amount": 900}])
        result = seller_portal.pay_bills([{"sales_invoice": mine, "amount": 900}])
        self.assertEqual(flt(result["total"]), 900)
        self.assertEqual(flt(frappe.db.get_value("Sales Invoice", mine, "outstanding_amount")), 0)
