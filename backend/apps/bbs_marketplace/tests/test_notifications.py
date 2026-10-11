import frappe
from django.core import mail

from apps.bbs_marketplace import setup
from apps.bbs_marketplace.marketplace import orders
from apps.bbs_marketplace.tests.base import MarketplaceTestCase


class TestNotifications(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        frappe.db.sql('delete from "tabMarketplace Notification Template"')
        setup.ensure_notification_templates()
        settings = frappe.get_single("Marketplace Settings")
        settings.notifications_enabled = 1
        settings.send_email_notifications = 1
        settings.send_sms_notifications = 1
        settings.storefront_url = "https://shop.example.com"
        settings.support_phone = "0700000000"
        settings.save()
        self.seller = self.make_seller("Notify Shop")
        frappe.db.set_value("Marketplace Seller", self.seller, {"contact_email": "notify.shop@example.com", "contact_phone": "0733111222"})
        self.buyer = self.make_customer("Notify Buyer")
        frappe.db.set_value("Customer", self.buyer, {"email_id": "buyer@example.com", "mobile_no": "0722333444"})
        self.listing = self.make_listing(self.seller, "MKT-NOTIFY-1", price=1160)

    def logs(self, event, channel=None, reference=None):
        filters = {"event_name": event}
        if channel:
            filters["channel"] = channel
        if reference:
            filters["reference_name"] = reference
        return frappe.get_all("Marketplace Notification Log", filters=filters, fields=["recipient", "status", "message", "subject", "channel", "audience"])

    def test_placing_an_order_emails_and_texts_the_buyer(self):
        order = self.place_order(self.buyer, self.listing, 1)
        emails = self.logs("Order Placed", "Email", order.name)
        self.assertEqual([row.recipient for row in emails], ["buyer@example.com"])
        self.assertEqual(emails[0].status, "Sent")
        self.assertIn(order.name, emails[0].subject)
        self.assertIn("https://shop.example.com/orders/" + order.name, emails[0].message)
        self.assertTrue(any("buyer@example.com" in message.to for message in mail.outbox))
        texts = self.logs("Order Placed", "SMS", order.name)
        self.assertEqual(len(texts), 1)
        self.assertIn(order.name, texts[0].message)
        self.assertIn(texts[0].status, ("Sent", "Skipped"))

    def test_payment_notifies_buyer_and_seller(self):
        order = self.place_order(self.buyer, self.listing, 1)
        self.pay(order)
        self.assertTrue(self.logs("Payment Received", "Email", order.name))
        seller_order = frappe.db.get_value("Seller Order", {"marketplace_order": order.name})
        seller_mail = self.logs("New Order for Seller", "Email", seller_order)
        self.assertEqual([row.recipient for row in seller_mail], ["notify.shop@example.com"])
        self.assertEqual(seller_mail[0].audience, "Seller")

    def test_every_fulfilment_step_reaches_the_buyer(self):
        order = self.place_order(self.buyer, self.listing, 1)
        self.pay(order)
        seller_order = frappe.get_doc("Seller Order", {"marketplace_order": order.name})
        seller_order.accept()
        seller_order.mark_packed()
        seller_order.mark_shipped("TRK-777")
        shipped = self.logs("Order Shipped", "Email", order.name)
        self.assertEqual(len(shipped), 1)
        self.assertIn("TRK-777", shipped[0].message)
        sms = self.logs("Order Shipped", "SMS", order.name)
        self.assertIn("TRK-777", sms[0].message)
        shipment = frappe.get_doc("Marketplace Shipment", seller_order.reload().shipment)
        shipment.set_status("Out for Delivery")
        self.assertEqual(len(self.logs("Out for Delivery", "Email", shipment.name)), 1)
        seller_order.reload().mark_delivered()
        self.assertEqual(len(self.logs("Order Delivered", "Email", order.name)), 1)

    def test_cancelling_tells_the_buyer_why(self):
        order = self.place_order(self.buyer, self.listing, 1)
        self.pay(order)
        orders.cancel_order(order.name, "Out of stock at the warehouse")
        cancelled = self.logs("Order Cancelled", "Email", order.name)
        self.assertEqual(len(cancelled), 1)
        self.assertIn("Out of stock at the warehouse", cancelled[0].message)

    def test_disabled_template_and_global_switch_are_respected(self):
        frappe.db.set_value("Marketplace Notification Template", "Order Placed", "enabled", 0)
        order = self.place_order(self.buyer, self.listing, 1)
        self.assertFalse(self.logs("Order Placed", reference=order.name))
        frappe.db.set_value("Marketplace Notification Template", "Order Placed", "enabled", 1)
        frappe.db.set_single_value("Marketplace Settings", "notifications_enabled", 0)
        other = self.place_order(self.buyer, self.listing, 1)
        self.assertFalse(self.logs("Order Placed", reference=other.name))

    def test_seller_status_changes_notify_staff_and_seller(self):
        frappe.get_doc({"doctype": "User", "email": "mgr.notify@example.com", "first_name": "Mgr", "send_welcome_email": 0, "roles": [{"role": "Marketplace Manager"}]}).insert(ignore_permissions=True)
        listing = frappe.get_doc("Marketplace Listing", self.listing)
        listing.status = "Paused"
        listing.save()
        listing.status = "Archived"
        listing.save()
        listing.status = "Draft"
        listing.save()
        listing.status = "Pending Approval"
        listing.save()
        self.assertTrue(self.logs("Listing Awaiting Review", "Email", listing.name))
        listing.status = "Approved"
        listing.save()
        self.assertEqual([row.recipient for row in self.logs("Listing Approved", "Email", listing.name)], ["notify.shop@example.com"])
