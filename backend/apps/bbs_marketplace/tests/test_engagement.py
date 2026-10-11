import frappe
from frappe.utils import flt

from apps.bbs_marketplace.marketplace import commission, engagement, plans, store, wallet
from apps.bbs_marketplace.tests.base import MarketplaceTestCase

BUYER_USER = "wish.buyer@example.com"


class TestEngagement(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_seller("Growth Shop")
        self.buyer = self.make_customer("Growth Buyer")
        self.funding_listing = self.fund_wallet(self.seller, self.buyer)

    def make_plan(self, name, fee, limit=0, rate=0):
        if frappe.db.exists("Seller Plan", name):
            return name
        return frappe.get_doc({"doctype": "Seller Plan", "plan_name": name, "enabled": 1, "monthly_fee": fee, "annual_fee": fee * 10, "listing_limit": limit, "commission_rate": rate}).insert().name

    def set_settings_accounts(self):
        settings = frappe.get_single("Marketplace Settings")
        self.assertTrue(settings.subscription_income_account)
        self.assertTrue(settings.advertising_income_account)

    def test_plan_limits_listings(self):
        tiny = self.make_plan("Tiny Plan", 0, limit=1)
        plans.set_seller_plan(self.seller, tiny, None)
        with self.assertRaises(frappe.ValidationError):
            self.make_listing(self.seller, "MKT-LIMIT-1")
        pro = self.make_plan("Pro Plan Limitless", 500, limit=0)
        plans.set_seller_plan(self.seller, pro, None)
        self.assertTrue(self.make_listing(self.seller, "MKT-LIMIT-2"))

    def test_subscription_charges_wallet_posts_income_and_vat(self):
        self.set_settings_accounts()
        pro = self.make_plan("Pro Plan", 1000, rate=5)
        before = wallet.balances(self.seller)["available"]
        sub = frappe.get_doc({"doctype": "Seller Subscription", "seller": self.seller, "plan": pro, "billing_period": "Monthly"}).insert()
        self.assertEqual(flt(sub.total), 1160)
        sub.activate()
        sub.reload()
        self.assertEqual(sub.status, "Active")
        debit, credit = self.gl_total(sub.journal_entry)
        self.assertEqual(debit, credit)
        self.assertEqual(debit, 1160)
        self.assertEqual(wallet.balances(self.seller)["available"], flt(before - 1160, 2))
        self.assertEqual(frappe.db.get_value("Marketplace Seller", self.seller, "current_plan"), pro)
        group = frappe.db.get_value("Marketplace Listing", self.funding_listing, "item_group")
        self.assertEqual(commission.resolve(self.seller, group, None, "B2C")["rate"], 5)
        sub.cancel_subscription()
        self.assertNotEqual(frappe.db.get_value("Marketplace Seller", self.seller, "current_plan"), pro)

    def test_subscription_needs_available_funds(self):
        poor = self.make_seller("Poor Shop")
        pricey = self.make_plan("Premium Plan", 90000)
        sub = frappe.get_doc({"doctype": "Seller Subscription", "seller": poor, "plan": pricey, "billing_period": "Monthly"}).insert()
        with self.assertRaises(frappe.ValidationError):
            sub.activate()

    def test_ads_sponsor_listings_and_end(self):
        if not frappe.db.exists("Ad Package", "Search Boost Week"):
            frappe.get_doc({"doctype": "Ad Package", "package_name": "Search Boost Week", "enabled": 1, "placement": "Search Boost", "price": 500, "duration_days": 7, "max_listings": 1}).insert()
        other = self.make_listing(self.seller, "MKT-AD-OTHER", price=900)
        target = self.make_listing(self.seller, "MKT-AD-TARGET", price=900)
        ad = frappe.get_doc({"doctype": "Seller Ad", "seller": self.seller, "package": "Search Boost Week", "listings": [{"listing": target}]}).insert()
        self.assertEqual(flt(ad.total), 580)
        ad.activate()
        self.assertEqual(frappe.db.get_value("Marketplace Listing", target, "is_sponsored"), 1)
        debit, credit = self.gl_total(frappe.db.get_value("Seller Ad", ad.name, "journal_entry"))
        self.assertEqual(debit, credit)
        found = store.search_listings(seller=self.seller, sort="popular")["items"]
        self.assertEqual(found[0]["name"], target)
        self.assertTrue(found[0]["sponsored"])
        self.assertNotIn(other, [found[0]["name"]])
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Seller Ad", "seller": self.seller, "package": "Search Boost Week", "listings": [{"listing": target}, {"listing": other}]}).insert()
        ad.cancel_ad()
        self.assertEqual(frappe.db.get_value("Marketplace Listing", target, "is_sponsored"), 0)

    def test_wishlist_and_compare(self):
        if not frappe.db.exists("User", BUYER_USER):
            frappe.get_doc({"doctype": "User", "email": BUYER_USER, "first_name": "Wish", "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True)
        frappe.db.set_value("Customer", self.buyer, "marketplace_user", BUYER_USER)
        listing = self.make_listing(self.seller, "MKT-WISH-1", price=700)
        second = self.make_listing(self.seller, "MKT-WISH-2", price=800)
        frappe.set_user(BUYER_USER)
        try:
            self.assertTrue(engagement.toggle_wishlist(listing)["wishlisted"])
            self.assertEqual([card["name"] for card in engagement.get_wishlist()], [listing])
            self.assertEqual(frappe.db.get_value("Marketplace Listing", listing, "wishlist_count"), 1)
            result = engagement.toggle_wishlist(listing)
            self.assertFalse(result["wishlisted"])
            self.assertEqual(result["count"], 0)
            compared = engagement.compare_listings([listing, second])
            self.assertEqual(len(compared["items"]), 2)
        finally:
            frappe.set_user("Administrator")

    def test_digital_goods_deliver_instantly_and_limit_downloads(self):
        item = self.make_item("MKT-DIGITAL-1")
        listing = frappe.get_doc(
            {
                "doctype": "Marketplace Listing",
                "listing_title": "Ebook",
                "item": item,
                "seller": self.seller,
                "status": "Draft",
                "price": 580,
                "vat_rate": 16,
                "price_includes_vat": 1,
                "stock_qty": 1,
                "is_digital": 1,
                "download_limit": 2,
                "digital_files": [{"title": "Ebook PDF", "file": "/private/files/ebook.pdf"}],
                "images": [{"image": "/files/ebook.png", "is_primary": 1}],
            }
        ).insert()
        for status in ("Pending Approval", "Approved", "Published"):
            listing.status = status
            listing.save()
        order = frappe.get_doc(
            {
                "doctype": "Marketplace Order",
                "customer": self.buyer,
                "buyer_type": "B2C",
                "company": "_Test Company",
                "payment_method": "M-Pesa",
                "delivery_method": "Courier Delivery",
                "delivery_zone": self.zone,
                "recipient_name": "Reader",
                "recipient_phone": "0711000000",
                "items": [{"listing": listing.name, "qty": 1}],
            }
        ).insert()
        self.assertEqual(flt(order.shipping_total), 0)
        self.pay(order)
        seller_order = frappe.db.get_value("Seller Order", {"marketplace_order": order.name}, ["name", "status"], as_dict=True)
        self.assertEqual(seller_order.status, "Delivered")
        order.reload()
        self.assertEqual(order.status, "Delivered")
        frappe.db.set_value("Customer", self.buyer, "marketplace_user", BUYER_USER)
        if not frappe.db.exists("User", BUYER_USER):
            frappe.get_doc({"doctype": "User", "email": BUYER_USER, "first_name": "Wish", "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True)
        frappe.set_user(BUYER_USER)
        try:
            downloads = engagement.get_downloads(order.name)
            self.assertEqual(downloads[0]["downloads_left"], 2)
            line = downloads[0]["order_item"]
            self.assertEqual(engagement.download_file(order.name, line, 0)["url"], "/private/files/ebook.pdf")
            engagement.download_file(order.name, line, 0)
            with self.assertRaises(frappe.ValidationError):
                engagement.download_file(order.name, line, 0)
        finally:
            frappe.set_user("Administrator")
