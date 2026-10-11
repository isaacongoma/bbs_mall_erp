import frappe
from frappe.utils import flt

from apps.bbs_marketplace.marketplace import engagement, orders, store, variants
from apps.bbs_marketplace.tests.base import MarketplaceTestCase

COLOUR = "MKT Colour"
SIZE = "MKT Size"


class TestVariants(MarketplaceTestCase):
    def setUp(self):
        super().setUp()
        self.seller = self.make_seller("Variant Shop")
        self.buyer = self.make_customer("Variant Buyer")
        self.make_attribute(COLOUR, [("Red", "RED"), ("Blue", "BLU")])
        self.make_attribute(SIZE, [("S", "S"), ("M", "M")])
        self.listing = self.make_listing(self.seller, "MKT-TEE-1", price=1160)
        self.generated = variants.generate(self.listing, {COLOUR: ["Red", "Blue"], SIZE: ["S", "M"]})

    def make_attribute(self, name, values):
        if frappe.db.exists("Item Attribute", name):
            return
        frappe.get_doc(
            {"doctype": "Item Attribute", "attribute_name": name, "item_attribute_values": [{"attribute_value": value, "abbr": abbr} for value, abbr in values]}
        ).insert(ignore_permissions=True)

    def variant_with(self, colour, size):
        for row in frappe.get_doc("Marketplace Listing", self.listing).variants:
            chosen = variants.options_map(row.item_code)
            if chosen.get(COLOUR) == colour and chosen.get(SIZE) == size:
                return row.item_code
        self.fail("variant missing")

    def stock(self, code, qty, price=None):
        doc = frappe.get_doc("Marketplace Listing", self.listing)
        for row in doc.variants:
            if row.item_code == code:
                row.stock_qty = qty
                row.price = price
        doc.save()

    def test_generation_builds_every_combination_on_the_template_item(self):
        doc = frappe.get_doc("Marketplace Listing", self.listing)
        self.assertEqual(self.generated["created"], 4)
        self.assertEqual(len(doc.variants), 4)
        self.assertEqual(doc.has_variants, 1)
        self.assertEqual(frappe.db.get_value("Item", doc.item, "has_variants"), 1)
        self.assertEqual({row.attribute for row in doc.variant_axes}, {COLOUR, SIZE})
        again = variants.generate(self.listing, {COLOUR: ["Red", "Blue"], SIZE: ["S", "M"]})
        self.assertEqual(again["created"], 0)
        self.assertEqual(len(frappe.get_doc("Marketplace Listing", self.listing).variants), 4)
        with self.assertRaises(frappe.ValidationError):
            variants.generate(self.listing, {COLOUR: ["Purple"]})

    def test_order_needs_an_option_and_reserves_that_variants_stock(self):
        red_s = self.variant_with("Red", "S")
        blue_m = self.variant_with("Blue", "M")
        self.stock(red_s, 5)
        self.stock(blue_m, 3)
        with self.assertRaises(frappe.ValidationError):
            self.place_order(self.buyer, self.listing, 1)
        order = self.place_order(self.buyer, self.listing, 1, items=[{"listing": self.listing, "variant_item": red_s, "qty": 2}])
        self.assertEqual(order.items[0].item_code, red_s)
        self.assertIn("Red", order.items[0].item_name)
        doc = frappe.get_doc("Marketplace Listing", self.listing)
        rows = {row.item_code: row for row in doc.variants}
        self.assertEqual(flt(rows[red_s].reserved_qty), 2)
        self.assertEqual(flt(rows[blue_m].reserved_qty), 0)
        self.assertEqual(flt(doc.reserved_qty), 2)
        self.assertEqual(flt(doc.available_qty), 6)
        with self.assertRaises(frappe.ValidationError):
            self.place_order(self.buyer, self.listing, 1, items=[{"listing": self.listing, "variant_item": blue_m, "qty": 4}])

    def test_variant_price_overrides_listing_price(self):
        red_s = self.variant_with("Red", "S")
        red_m = self.variant_with("Red", "M")
        self.stock(red_s, 5, price=1740)
        self.stock(red_m, 5)
        dear = self.place_order(self.buyer, self.listing, 1, items=[{"listing": self.listing, "variant_item": red_s, "qty": 1}])
        base = self.place_order(self.buyer, self.listing, 1, items=[{"listing": self.listing, "variant_item": red_m, "qty": 1}])
        self.assertEqual(flt(dear.items[0].amount), 1740)
        self.assertEqual(flt(base.items[0].amount), 1160)
        card = store.listing_card(frappe._dict(name=self.listing))
        self.assertEqual(card["price_from"], 1160)
        self.assertEqual(card["price_to"], 1740)

    def test_delivery_commits_and_return_restocks_the_same_variant(self):
        blue_s = self.variant_with("Blue", "S")
        self.stock(blue_s, 10)
        order = self.place_order(self.buyer, self.listing, 1, items=[{"listing": self.listing, "variant_item": blue_s, "qty": 2}])
        self.pay(order)
        seller_order = frappe.get_doc("Seller Order", {"marketplace_order": order.name})
        self.assertEqual(seller_order.items[0].variant_item, blue_s)
        seller_order.accept()
        seller_order.mark_packed()
        seller_order.mark_shipped("TRK-V")
        seller_order.mark_delivered()
        rows = {row.item_code: row for row in frappe.get_doc("Marketplace Listing", self.listing).variants}
        self.assertEqual(flt(rows[blue_s].stock_qty), 8)
        self.assertEqual(flt(rows[blue_s].reserved_qty), 0)
        request = frappe.get_doc(
            {
                "doctype": "Return Request",
                "marketplace_order": order.name,
                "seller_order": seller_order.name,
                "reason": "Faulty",
                "items": [{"order_item": seller_order.reload().items[0].name, "qty": 1, "restock": 1}],
            }
        ).insert()
        request.decide(True)
        request.receive()
        request.refund()
        rows = {row.item_code: row for row in frappe.get_doc("Marketplace Listing", self.listing).variants}
        self.assertEqual(flt(rows[blue_s].stock_qty), 9)

    def test_cancel_releases_the_variant_reservation(self):
        red_m = self.variant_with("Red", "M")
        self.stock(red_m, 4)
        order = self.place_order(self.buyer, self.listing, 1, items=[{"listing": self.listing, "variant_item": red_m, "qty": 3}])
        orders.cancel_order(order.name, "Changed my mind")
        rows = {row.item_code: row for row in frappe.get_doc("Marketplace Listing", self.listing).variants}
        self.assertEqual(flt(rows[red_m].reserved_qty), 0)

    def test_storefront_shows_options_filters_and_cart_needs_a_choice(self):
        red_s = self.variant_with("Red", "S")
        self.stock(red_s, 5)
        detail = store.get_listing(listing=self.listing)
        axes = {axis["attribute"]: axis["values"] for axis in detail["options"]}
        self.assertEqual(set(axes[COLOUR]), {"Red", "Blue"})
        self.assertEqual(len(detail["variants"]), 4)
        found = store.search_listings(variant_attributes={COLOUR: ["Red"]}, seller=self.seller)
        self.assertEqual([card["name"] for card in found["items"]], [self.listing])
        none = store.search_listings(variant_attributes={COLOUR: ["Green"]}, seller=self.seller)
        self.assertEqual(none["total"], 0)
        facet = {row["attribute"]: row["values"] for row in found["facets"]["options"]}
        self.assertIn(COLOUR, facet)
        with self.assertRaises(frappe.ValidationError):
            store.add_to_cart(self.listing, 1, session_key="variant-cart")
        cart = store.add_to_cart(self.listing, 1, session_key="variant-cart", variant=red_s)
        self.assertEqual(cart["items"][0]["variant"], red_s)
        self.assertIn("Red", cart["items"][0]["options"])

    def test_category_attributes_drive_filters(self):
        group = frappe.db.get_value("Marketplace Listing", self.listing, "item_group")
        doc = frappe.get_doc("Item Group", group)
        doc.append("marketplace_attributes", {"attribute": COLOUR, "use_for_variants": 1, "filterable": 1, "required": 0})
        doc.save(ignore_permissions=True)
        filters = engagement.get_category_filters(group)
        self.assertEqual([row["attribute"] for row in filters], [COLOUR])
        self.assertIn("Red", filters[0]["values"])
