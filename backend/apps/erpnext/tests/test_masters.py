from django.test import TestCase

import frappe
from apps.erpnext.registry import get_model
from apps.erpnext.selling.doctype.customer.customer import Customer
from apps.erpnext.stock.doctype.item.item import Item
from apps.erpnext.buying.doctype.supplier.supplier import Supplier
from apps.frappe import exceptions
from apps.frappe.runtime import get_doc, new_doc, session


class TestMasters(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def set_setting(self, doctype, fieldname, value):
        settings = get_doc(doctype)
        settings.set(fieldname, value)
        settings.save()

    def make_customer(self, name="Master Customer"):
        customer = new_doc("Customer")
        customer.customer_name = name
        customer.customer_type = "Company"
        customer.insert()
        return customer

    def test_customer_defaults_to_customer_name_after_install(self):
        customer = self.make_customer("Named Customer")
        self.assertEqual(customer.name, "Named Customer")
        self.assertIsInstance(get_doc("Customer", customer.name), Customer)

    def test_customer_is_named_by_series_when_configured(self):
        self.set_setting("Selling Settings", "cust_master_name", "Naming Series")
        customer = self.make_customer()
        self.assertRegex(customer.name, r"^CUST-\d{4}-\d{5}$")
        self.assertIsInstance(get_doc("Customer", customer.name), Customer)

    def test_customer_series_increments(self):
        self.set_setting("Selling Settings", "cust_master_name", "Naming Series")
        first = self.make_customer("First Customer")
        second = self.make_customer("Second Customer")
        self.assertEqual(int(second.name[-5:]), int(first.name[-5:]) + 1)

    def test_supplier_is_named_by_series_when_configured(self):
        self.set_setting("Buying Settings", "supp_master_name", "Naming Series")
        supplier = new_doc("Supplier")
        supplier.supplier_name = "Master Supplier"
        supplier.insert()
        self.assertRegex(supplier.name, r"^SUP-\d{4}-\d{5}$")
        self.assertIsInstance(get_doc("Supplier", supplier.name), Supplier)

    def test_item_requires_known_uom_and_item_group(self):
        item = new_doc("Item")
        item.item_code = "MASTER-ITEM"
        item.item_name = "Master Item"
        item.item_group = "All Item Groups"
        item.stock_uom = "Nos"
        item.insert()
        self.assertEqual(item.name, "MASTER-ITEM")
        self.assertIsInstance(get_doc("Item", "MASTER-ITEM"), Item)

        bad = new_doc("Item")
        bad.item_code = "BAD-UOM"
        bad.item_name = "Bad"
        bad.item_group = "All Item Groups"
        bad.stock_uom = "No Such UOM"
        with self.assertRaises(exceptions.LinkValidationError):
            bad.insert()

    def test_item_codes_are_unique(self):
        for _ in range(2):
            item = new_doc("Item")
            item.item_code = "DUP-ITEM"
            item.item_name = "Dup"
            item.item_group = "All Item Groups"
            item.stock_uom = "Nos"
            if _ == 0:
                item.insert()
        with self.assertRaises(exceptions.DuplicateEntryError):
            item.insert()

    def test_base_fixtures_are_installed(self):
        self.assertTrue(frappe.db.exists("UOM", "Nos"))
        self.assertTrue(frappe.db.exists("Item Group", "All Item Groups"))
        self.assertTrue(frappe.db.exists("Territory", "All Territories"))
        self.assertTrue(frappe.db.exists("Customer Group", "All Customer Groups"))
        self.assertTrue(frappe.db.exists("Country", "Kenya"))
        self.assertTrue(get_model("Warehouse Type").objects.filter(pk="Transit").exists())
