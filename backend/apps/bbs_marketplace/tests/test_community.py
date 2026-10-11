import frappe

from apps.bbs_marketplace.marketplace import community
from apps.bbs_marketplace.tests.base import MarketplaceTestCase

USER = "community.buyer@example.com"


class TestCommunity(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_seller("Community Shop")
        self.buyer = self.make_customer("Community Buyer")
        if not frappe.db.exists("User", USER):
            frappe.get_doc({"doctype": "User", "email": USER, "first_name": "Com", "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True)
        frappe.db.set_value("Customer", self.buyer, "marketplace_user", USER)
        self.listing = self.make_listing(self.seller, "MKT-COM-1", price=500)
        self.other = self.make_listing(self.seller, "MKT-COM-2", price=700)

    def tearDown(self):
        frappe.set_user("Administrator")
        super().tearDown()

    def test_questions_follow_views_bundle_and_feed(self):
        frappe.set_user(USER)
        name = community.ask_question(self.listing, "Does it come with a warranty?")
        self.assertEqual(community.get_questions(self.listing), [])
        frappe.set_user("Administrator")
        community.answer_question(name, "Yes, one year.")
        self.assertEqual([q.answer for q in community.get_questions(self.listing)], ["Yes, one year."])
        frappe.set_user(USER)
        self.assertTrue(community.toggle_follow_seller(self.seller)["following"])
        self.assertEqual([s.name for s in community.get_followed_sellers()], [self.seller])
        self.assertFalse(community.toggle_follow_seller(self.seller)["following"])
        community.record_view(self.listing)
        community.record_view(self.other)
        community.record_view(self.listing)
        self.assertEqual([c["name"] for c in community.get_recently_viewed()], [self.listing, self.other])
        frappe.set_user("Administrator")
        doc = frappe.get_doc("Marketplace Listing", self.listing)
        doc.append("bundle_items", {"listing": self.other})
        doc.save()
        self.assertEqual([c["name"] for c in community.get_bundle(self.listing)], [self.other])
        feed = community.get_catalog_feed()
        self.assertIn(self.listing, [row.name for row in feed])
        self.assertIn("<g:price>500.00", community.get_catalog_feed("xml"))
        chart = frappe.get_doc({"doctype": "Marketplace Size Chart", "chart_name": "Tee Chart", "rows": [{"size_label": "M", "measurements": "Chest 96"}]}).insert()
        frappe.db.set_value("Marketplace Listing", self.listing, "size_chart", chart.name)
        self.assertEqual(community.get_size_chart(self.listing)["rows"][0]["size"], "M")
