import frappe
from frappe.utils import random_string

from erpnext.accounts.doctype.pos_profile.test_pos_profile import make_pos_profile
from erpnext.selling.page.point_of_sale.point_of_sale import get_items
from erpnext.stock.doctype.stock_entry.stock_entry_utils import make_stock_entry
from erpnext.tests.utils import ERPNextTestSuite


class TestPointOfSaleGetItems(ERPNextTestSuite):
    """Covers the raw-SQL -> frappe.qb conversion of point_of_sale.get_items."""

    def setUp(self):
        super().setUp()
        self.item_group = "_Test Item Group"

        self.item_code = "_Test POS Item " + random_string(10)
        item = frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": self.item_code,
                "item_name": self.item_code,
                "item_group": self.item_group,
                "stock_uom": "_Test UOM",
                "is_stock_item": 0,
                "is_sales_item": 1,
                "is_fixed_asset": 0,
                "has_variants": 0,
                "disabled": 0,
            }
        )
        item.insert()
        self.item = item

        self.pos_profile = make_pos_profile().name

    def _get_item_codes(self, search_term):
        result = get_items(
            start=0,
            page_length=100,
            price_list="Standard Selling",
            item_group=self.item_group,
            pos_profile=self.pos_profile,
            search_term=search_term,
        )
        items = result["items"] if isinstance(result, dict) else result
        return [row.get("item_code") for row in items]

    def _make_stock_item(self):
        item_code = "_Test POS Stock Item " + random_string(10)
        frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": item_code,
                "item_name": item_code,
                "item_group": self.item_group,
                "stock_uom": "_Test UOM",
                "is_stock_item": 1,
                "is_sales_item": 1,
                "is_fixed_asset": 0,
                "has_variants": 0,
                "disabled": 0,
            }
        ).insert()
        return item_code

    def test_matching_search_term_returns_item(self):
        item_codes = self._get_item_codes(self.item_code)
        self.assertIn(self.item_code, item_codes)

    def test_non_matching_search_term_excludes_item(self):
        non_matching = "zzz_no_such_item_" + random_string(10)
        item_codes = self._get_item_codes(non_matching)
        self.assertNotIn(self.item_code, item_codes)

    def test_partial_search_term_matches_on_item_name(self):
        partial = self.item_code.split(" ")[-1]
        item_codes = self._get_item_codes(partial)
        self.assertIn(self.item_code, item_codes)

    def test_disabled_item_is_excluded(self):
        frappe.db.set_value("Item", self.item_code, "disabled", 1)
        item_codes = self._get_item_codes(self.item_code)
        self.assertNotIn(self.item_code, item_codes)

    def test_pos_profile_item_group_restriction_returns_items(self):
        from erpnext.accounts.doctype.pos_profile.pos_profile import get_item_groups

        restricted = make_pos_profile(name="_Test POS Profile IG Restricted")
        restricted.append("item_groups", {"item_group": self.item_group})
        restricted.save()

        self.assertIn(self.item_group, get_item_groups(restricted.name))

        result = get_items(
            start=0,
            page_length=100,
            price_list="Standard Selling",
            item_group=self.item_group,
            pos_profile=restricted.name,
            search_term="",
        )
        items = result["items"] if isinstance(result, dict) else result
        self.assertIn(self.item_code, [row.get("item_code") for row in items])

    def test_non_sales_item_is_excluded(self):
        frappe.db.set_value("Item", self.item_code, "is_sales_item", 0)
        item_codes = self._get_item_codes(self.item_code)
        self.assertNotIn(self.item_code, item_codes)

    def test_hide_unavailable_items_filters_on_bin_actual_qty(self):
        warehouse = frappe.db.get_value("POS Profile", self.pos_profile, "warehouse")
        frappe.db.set_value("POS Profile", self.pos_profile, "hide_unavailable_items", 1)

        in_stock_item = self._make_stock_item()
        out_of_stock_item = self._make_stock_item()

        make_stock_entry(item_code=in_stock_item, target=warehouse, qty=5, basic_rate=100)

        self.assertGreater(
            frappe.db.get_value("Bin", {"item_code": in_stock_item, "warehouse": warehouse}, "actual_qty")
            or 0,
            0,
        )
        self.assertFalse(frappe.db.exists("Bin", {"item_code": out_of_stock_item}))

        in_stock_codes = self._get_item_codes(in_stock_item)
        self.assertIn(in_stock_item, in_stock_codes)

        out_of_stock_codes = self._get_item_codes(out_of_stock_item)
        self.assertNotIn(out_of_stock_item, out_of_stock_codes)

    def test_get_parent_item_group_returns_common_ancestor(self):
        from erpnext.selling.page.point_of_sale.point_of_sale import get_parent_item_group

        root = frappe.db.get_value("Item Group", {"is_group": 1, "lft": 1}, "name")
        suffix = random_string(6)

        def make_group(name, parent, is_group=0):
            return (
                frappe.get_doc(
                    {
                        "doctype": "Item Group",
                        "item_group_name": name,
                        "parent_item_group": parent,
                        "is_group": is_group,
                    }
                )
                .insert()
                .name
            )

        branch_a = make_group(f"_Test POS LCA A {suffix}", root, is_group=1)
        leaf_a1 = make_group(f"_Test POS LCA A1 {suffix}", branch_a)
        leaf_a2 = make_group(f"_Test POS LCA A2 {suffix}", branch_a)
        branch_b = make_group(f"_Test POS LCA B {suffix}", root, is_group=1)
        leaf_b1 = make_group(f"_Test POS LCA B1 {suffix}", branch_b)

        profile = make_pos_profile(name=f"_Test POS Profile LCA Root {suffix}")
        profile.append("item_groups", {"item_group": leaf_a1})
        profile.append("item_groups", {"item_group": leaf_b1})
        profile.save()
        self.assertEqual(get_parent_item_group(profile.name), root)

        profile = make_pos_profile(name=f"_Test POS Profile LCA Branch {suffix}")
        profile.append("item_groups", {"item_group": leaf_a1})
        profile.append("item_groups", {"item_group": leaf_a2})
        profile.save()
        self.assertEqual(get_parent_item_group(profile.name), branch_a)

        profile = make_pos_profile(name=f"_Test POS Profile LCA Single {suffix}")
        profile.append("item_groups", {"item_group": leaf_a1})
        profile.save()
        self.assertEqual(get_parent_item_group(profile.name), leaf_a1)
