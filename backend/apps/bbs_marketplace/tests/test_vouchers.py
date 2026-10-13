import frappe
from frappe.utils import add_days, flt, today

from apps.bbs_marketplace.marketplace import orders, seller_portal, vouchers
from apps.bbs_marketplace.tests.base import MarketplaceTestCase

BUYER_USER = "voucher.buyer@example.com"


class TestVouchers(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_seller("Voucher Shop")
        self.other_seller = self.make_seller("Other Voucher Shop")
        self.buyer = self.make_customer("Voucher Buyer")
        self.listing = self.make_listing(self.seller, "MKT-VCH-1", price=1160)
        self.other_listing = self.make_listing(self.other_seller, "MKT-VCH-2", price=1160)
        self.n = 0

    def voucher(self, **values):
        self.n += 1
        data = {
            "doctype": "Coupon Code",
            "coupon_name": f"TEST-VCH-{self.n}-{frappe.generate_hash(length=5)}",
            "voucher_marketplace": 1,
            "voucher_discount_type": "Percent",
            "voucher_discount_value": 10,
            "valid_upto": add_days(today(), 30),
        }
        data.update(values)
        data["coupon_code"] = data.get("coupon_code") or f"SAVE{self.n}{frappe.generate_hash(length=4).upper()}"
        return frappe.get_doc(data).insert()

    def order_with(self, voucher, listing=None, qty=2, **extra):
        return self.place_order(self.buyer, listing or self.listing, qty, coupon_code=voucher.name, **extra)

    def test_valid_until_is_required_and_dates_are_checked(self):
        with self.assertRaises(frappe.ValidationError):
            self.voucher(valid_upto=None)
        with self.assertRaises(frappe.ValidationError):
            self.voucher(valid_from=add_days(today(), 5), valid_upto=add_days(today(), 1))
        with self.assertRaises(frappe.ValidationError):
            self.voucher(voucher_discount_value=0)
        with self.assertRaises(frappe.ValidationError):
            self.voucher(voucher_discount_value=120)

    def test_platform_percent_voucher_with_cap_min_spend_and_limits(self):
        voucher = self.voucher(voucher_discount_value=20, voucher_max_discount=300, voucher_min_order=1000, maximum_use=5)
        order = self.order_with(voucher)
        self.assertEqual(flt(order.items[0].voucher_discount), 300)
        self.assertEqual(flt(order.items[0].amount), 2320 - 300)
        self.assertEqual(flt(order.platform_discount), 300)
        self.assertEqual(flt(order.seller_discount), 0)
        self.assertEqual(frappe.db.get_value("Coupon Code", voucher.name, "used"), 1)
        with self.assertRaises(frappe.ValidationError):
            self.order_with(voucher)
        small = self.voucher(voucher_min_order=5000)
        with self.assertRaises(frappe.ValidationError):
            self.order_with(small)
        orders.cancel_order(order.name, "Changed my mind")
        self.assertEqual(frappe.db.get_value("Coupon Code", voucher.name, "used"), 0)
        self.assertTrue(self.order_with(voucher))

    def test_platform_voucher_does_not_cost_the_seller(self):
        voucher = self.voucher(voucher_discount_value=10)
        order = self.order_with(voucher)
        self.pay(order)
        so = frappe.get_doc("Seller Order", {"marketplace_order": order.name})
        for action in (so.accept, so.mark_packed):
            action()
        so.mark_shipped("T1")
        so.mark_delivered()
        so.reload()
        self.assertEqual(flt(so.platform_discount), 232)
        self.assertEqual(flt(so.seller_net), 2088)
        debit, credit = self.gl_total(so.journal_entry)
        self.assertEqual(debit, credit)

    def test_seller_voucher_only_discounts_that_sellers_items_and_costs_them(self):
        voucher = self.voucher(marketplace_seller=self.seller, voucher_discount_value=10)
        mixed = frappe.get_doc(
            {
                "doctype": "Marketplace Order",
                "customer": self.buyer,
                "buyer_type": "B2C",
                "company": "_Test Company",
                "payment_method": "M-Pesa",
                "delivery_method": "Courier Delivery",
                "delivery_zone": self.zone,
                "address_snapshot": "Street",
                "recipient_name": "B",
                "recipient_phone": "0711000000",
                "coupon_code": voucher.name,
                "items": [{"listing": self.listing, "qty": 1}, {"listing": self.other_listing, "qty": 1}],
            }
        ).insert()
        mine = next(row for row in mixed.items if row.listing == self.listing)
        theirs = next(row for row in mixed.items if row.listing == self.other_listing)
        self.assertEqual(flt(mine.voucher_discount), 116)
        self.assertEqual(flt(theirs.voucher_discount), 0)
        self.assertEqual(flt(mixed.seller_discount), 116)
        self.assertEqual(flt(mixed.platform_discount), 0)
        self.pay(mixed)
        so = frappe.get_doc("Seller Order", {"marketplace_order": mixed.name, "seller": self.seller})
        self.assertEqual(flt(so.seller_discount), 116)
        self.assertEqual(flt(so.platform_discount), 0)
        other = frappe.get_doc("Seller Order", {"marketplace_order": mixed.name, "seller": self.other_seller})
        self.assertEqual(flt(other.seller_discount), 0)

    def test_category_brand_and_product_scopes(self):
        group = frappe.db.get_value("Marketplace Listing", self.listing, "item_group")
        by_category = self.voucher(voucher_applies_to="Category", voucher_item_group=group)
        self.assertEqual(flt(self.order_with(by_category).items[0].voucher_discount), 232)
        picked = self.voucher(voucher_applies_to="Selected Products", voucher_products=[{"listing": self.other_listing}])
        with self.assertRaises(frappe.ValidationError):
            self.order_with(picked)
        self.assertEqual(flt(self.order_with(picked, self.other_listing).items[0].voucher_discount), 232)
        with self.assertRaises(frappe.ValidationError):
            self.voucher(marketplace_seller=self.seller, voucher_applies_to="Selected Products", voucher_products=[{"listing": self.other_listing}])

    def test_delivery_voucher_platform_and_seller_funded(self):
        platform = self.voucher(voucher_type="Delivery Discount", voucher_discount_value=100)
        order = self.order_with(platform)
        self.assertEqual(flt(order.shipping_total), 0)
        self.assertEqual(flt(order.shipping_discount), 200)
        self.pay(order)
        so = frappe.get_doc("Seller Order", {"marketplace_order": order.name})
        self.assertEqual(flt(so.shipping_fee), 0)
        self.assertEqual(flt(so.shipping_subsidy), 0)
        seller_issued = self.voucher(marketplace_seller=self.seller, voucher_type="Delivery Discount", voucher_discount_value=100)
        second = self.order_with(seller_issued)
        self.pay(second)
        so2 = frappe.get_doc("Seller Order", {"marketplace_order": second.name})
        self.assertEqual(flt(so2.shipping_subsidy), 200)
        for action in (so2.accept, so2.mark_packed):
            action()
        so2.mark_shipped("T2")
        so2.mark_delivered()
        so2.reload()
        self.assertEqual(flt(so2.seller_net), 2088 - 200)
        debit, credit = self.gl_total(so2.journal_entry)
        self.assertEqual(debit, credit)

    def test_collect_first_new_customers_and_expiry(self):
        if not frappe.db.exists("User", BUYER_USER):
            frappe.get_doc({"doctype": "User", "email": BUYER_USER, "first_name": "Vch", "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True)
        frappe.db.set_value("Customer", self.buyer, "marketplace_user", BUYER_USER)
        collect = self.voucher(voucher_must_collect=1)
        with self.assertRaises(frappe.ValidationError):
            self.order_with(collect)
        frappe.set_user(BUYER_USER)
        try:
            card = vouchers.claim_voucher(collect.coupon_code)
            self.assertTrue(card["claimed"])
            self.assertEqual([c["code"] for c in vouchers.get_my_vouchers()], [collect.coupon_code])
        finally:
            frappe.set_user("Administrator")
        self.assertTrue(self.order_with(collect))
        fresh = self.voucher(voucher_first_order_only=1)
        with self.assertRaises(frappe.ValidationError):
            self.order_with(fresh)
        expired = self.voucher(valid_from=add_days(today(), -10), valid_upto=add_days(today(), -1))
        with self.assertRaises(frappe.ValidationError):
            self.order_with(expired)
        public = self.voucher(marketplace_seller=self.seller)
        names = [c["name"] for c in vouchers.get_vouchers(seller=self.seller)]
        self.assertIn(public.name, names)
        self.assertNotIn(expired.name, names)

    def test_seller_portal_creates_vouchers_with_limits(self):
        user = "voucher.shop@example.com"
        if not frappe.db.exists("User", user):
            frappe.get_doc({"doctype": "User", "email": user, "first_name": "Shop", "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True)
        customer = frappe.get_doc("Customer", frappe.db.get_value("Marketplace Seller", self.seller, "customer"))
        customer.append("tenant_portal_users", {"user": user, "access_level": "Owner"})
        customer.save(ignore_permissions=True)
        frappe.set_user(user)
        try:
            name = seller_portal.save_voucher(
                {"coupon_code": "my shop 10", "discount_type": "Percent", "discount_value": 10, "valid_upto": str(add_days(today(), 14)), "min_order": 2000, "usage_limit": 50}
            )
            rows = seller_portal.get_vouchers()
            self.assertEqual([r.coupon_code for r in rows], ["MYSHOP10"])
            self.assertEqual(frappe.db.get_value("Coupon Code", name, "marketplace_seller"), self.seller)
            with self.assertRaises(frappe.ValidationError):
                seller_portal.save_voucher({"coupon_code": "TOOMUCH", "discount_type": "Percent", "discount_value": 90, "valid_upto": str(add_days(today(), 14))})
            with self.assertRaises(frappe.ValidationError):
                seller_portal.save_voucher({"coupon_code": "NOEND", "discount_type": "Percent", "discount_value": 5})
            self.assertEqual(seller_portal.set_voucher_status(name, "Paused"), "Paused")
        finally:
            frappe.set_user("Administrator")
        with self.assertRaises(frappe.ValidationError):
            self.order_with(frappe.get_doc("Coupon Code", name))
