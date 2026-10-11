import frappe
from frappe.utils import add_to_date, now_datetime

from apps.bbs_marketplace import setup
from apps.bbs_marketplace.marketplace import jobs
from apps.bbs_marketplace.tests.base import MarketplaceTestCase


class TestCartReminders(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        setup.ensure_notification_templates()
        settings = frappe.get_single("Marketplace Settings")
        settings.notifications_enabled = 1
        settings.send_email_notifications = 1
        settings.cart_reminders_enabled = 1
        settings.cart_first_reminder_hours = 4
        settings.cart_second_reminder_hours = 48
        settings.storefront_url = "https://shop.example.com"
        settings.save()
        self.seller = self.make_seller("Cart Shop")
        self.listing = self.make_listing(self.seller, "MKT-CART-1", price=500)
        self.buyer = self.make_customer("Cart Buyer")
        frappe.db.set_value("Customer", self.buyer, "email_id", "cart.buyer@example.com")
        self.cart = frappe.get_doc({"doctype": "Marketplace Cart", "customer": self.buyer, "buyer_type": "B2C", "items": [{"listing": self.listing, "qty": 2}]}).insert()

    def age(self, hours):
        frappe.db.set_value("Marketplace Cart", self.cart.name, "last_activity", add_to_date(now_datetime(), hours=-hours), update_modified=False)

    def logs(self):
        return frappe.get_all("Marketplace Notification Log", filters={"event_name": "Abandoned Cart Reminder", "reference_name": self.cart.name}, fields=["recipient", "status", "message"])

    def test_reminders_are_timed_limited_and_skip_unavailable_carts(self):
        self.age(1)
        self.assertEqual(jobs.send_cart_reminders(), 0)
        self.age(5)
        self.assertEqual(jobs.send_cart_reminders(), 1)
        rows = self.logs()
        self.assertEqual([r.recipient for r in rows], ["cart.buyer@example.com"])
        self.assertIn("https://shop.example.com/cart", rows[0].message)
        self.assertIn("Cart Buyer".split()[0] or "", rows[0].message or "Cart")
        self.assertEqual(jobs.send_cart_reminders(), 0)
        self.age(50)
        frappe.db.sql('delete from "tabMarketplace Notification Log" where event_name = %s', "Abandoned Cart Reminder")
        self.assertEqual(jobs.send_cart_reminders(), 1)
        self.age(100)
        self.assertEqual(jobs.send_cart_reminders(), 0)
        self.assertEqual(frappe.db.get_value("Marketplace Cart", self.cart.name, "reminder_count"), 2)

    def test_no_reminder_without_customer_or_after_an_order(self):
        guest = frappe.get_doc({"doctype": "Marketplace Cart", "session_key": "guest-x", "buyer_type": "B2C", "items": [{"listing": self.listing, "qty": 1}]}).insert()
        frappe.db.set_value("Marketplace Cart", guest.name, "last_activity", add_to_date(now_datetime(), hours=-10), update_modified=False)
        self.age(10)
        self.place_order(self.buyer, self.listing, 1)
        self.assertEqual(jobs.send_cart_reminders(), 0)
        self.assertEqual(frappe.db.get_value("Marketplace Cart", guest.name, "reminder_count") or 0, 0)
