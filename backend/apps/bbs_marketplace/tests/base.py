import frappe
from frappe.utils import flt, nowdate

from apps.bbs_marketplace import setup
from erpnext.tests.utils import ERPNextTestSuite

COMPANY = "_Test Company"


class MarketplaceTestCase(ERPNextTestSuite):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        setup.after_install()

    def setUp(self):
        super().setUp()
        setup.ensure_roles()
        settings = frappe.get_single("Marketplace Settings")
        settings.company = COMPANY
        for field in list(setup.ACCOUNTS):
            settings.set(field, None)
        settings.set("payment_methods", [])
        settings.output_vat_account = None
        setup.ensure_defaults(settings)
        settings.default_commission_rate = 10
        settings.commission_vat_rate = 16
        settings.hold_days_after_delivery = 7
        settings.min_withdrawal = 500
        settings.require_kyc_for_withdrawal = 1
        settings.auto_approve_below = 0
        settings.payout_bank_account = self.bank_account()
        settings.save()
        self.settings = settings
        self.zone = self.make_zone()
        self.courier = self.make_courier()
        settings.default_courier = self.courier
        settings.save()

    def bank_account(self):
        account = frappe.db.get_value("Account", {"company": COMPANY, "account_type": "Bank", "is_group": 0})
        if account:
            return account
        return frappe.get_doc(
            {"doctype": "Account", "account_name": "MKT Test Bank", "parent_account": "Bank Accounts - _TC", "company": COMPANY, "account_type": "Bank", "root_type": "Asset", "is_group": 0}
        ).insert().name

    def make_zone(self, name="Test Nairobi"):
        if frappe.db.exists("Delivery Zone", name):
            return name
        return frappe.get_doc({"doctype": "Delivery Zone", "zone_name": name, "areas": [{"county": "Nairobi"}]}).insert().name

    def make_courier(self, name="Test Courier"):
        if frappe.db.exists("Courier", name):
            return name
        supplier = frappe.db.get_value("Supplier", {"supplier_name": "_Test Supplier"}) or frappe.db.get_value("Supplier", {})
        return frappe.get_doc(
            {
                "doctype": "Courier",
                "courier_name": name,
                "courier_type": "Third Party",
                "supplier": supplier,
                "cod_supported": 1,
                "rates": [{"zone": self.zone, "service_level": "Standard", "min_weight": 0, "max_weight": 5, "base_rate": 200, "per_kg_rate": 50, "eta_days_min": 1, "eta_days_max": 3}],
            }
        ).insert().name

    def make_customer(self, name, **extra):
        if frappe.db.exists("Customer", name):
            return name
        return frappe.get_doc({"doctype": "Customer", "customer_name": name, "customer_group": "Individual", "territory": "All Territories", **extra}).insert().name

    def make_seller(self, name="Test Shop", activate=True):
        if frappe.db.exists("Marketplace Seller", name):
            return name
        customer = self.make_customer(f"{name} Tenant")
        seller = frappe.get_doc(
            {
                "doctype": "Marketplace Seller",
                "seller_name": name,
                "customer": customer,
                "status": "Pending Approval",
                "kyc_status": "Verified",
                "payout_accounts": [{"method": "M-Pesa", "mpesa_number": "0712345678", "account_holder": name, "is_default": 1, "verified": 1}],
            }
        ).insert()
        if activate:
            seller.status = "Active"
            seller.save()
        return seller.name

    def make_item(self, code, rate=1000):
        if frappe.db.exists("Item", code):
            return code
        return frappe.get_doc(
            {"doctype": "Item", "item_code": code, "item_name": code, "item_group": "All Item Groups", "stock_uom": "Nos", "is_stock_item": 0, "standard_rate": rate}
        ).insert().name

    def make_listing(self, seller, code="MKT-ITEM-1", price=1160, stock=50, vat=16, **extra):
        item = self.make_item(code)
        existing = frappe.db.get_value("Marketplace Listing", {"item": item})
        if existing:
            return existing
        listing = frappe.get_doc(
            {
                "doctype": "Marketplace Listing",
                "listing_title": f"Listing {code}",
                "item": item,
                "seller": seller,
                "status": "Draft",
                "price": price,
                "vat_rate": vat,
                "price_includes_vat": 1,
                "stock_qty": stock,
                "weight_kg": 1,
                "images": [{"image": "/files/test.png", "is_primary": 1}],
                **extra,
            }
        ).insert()
        for status in ("Pending Approval", "Approved", "Published"):
            listing.status = status
            listing.save()
        return listing.name

    def place_order(self, customer, listing, qty=1, method="M-Pesa", **extra):
        order = frappe.get_doc(
            {
                "doctype": "Marketplace Order",
                "customer": customer,
                "buyer_type": "B2C",
                "company": COMPANY,
                "payment_method": method,
                "delivery_method": "Courier Delivery",
                "delivery_zone": self.zone,
                "address_snapshot": "Test Street, Nairobi",
                "recipient_name": "Buyer",
                "recipient_phone": "0711000000",
                "items": [{"listing": listing, "qty": qty}],
                **extra,
            }
        )
        order.insert()
        return order

    def pay(self, order, amount=None, receipt="TEST123"):
        payment = frappe.get_doc(
            {"doctype": "Marketplace Payment", "marketplace_order": order.name, "method": order.payment_method, "amount": amount or order.grand_total, "phone": "0711000000", "status": "Pending"}
        ).insert()
        payment.mark_paid(receipt=receipt)
        return payment

    def gl_total(self, voucher_no):
        rows = frappe.db.sql('select coalesce(sum(debit),0), coalesce(sum(credit),0) from "tabGL Entry" where voucher_no = %s and is_cancelled = 0', voucher_no)[0]
        return flt(rows[0], 2), flt(rows[1], 2)

    def fund_wallet(self, seller, buyer, qty=3):
        from frappe.utils import add_days, today

        from apps.bbs_marketplace.marketplace import wallet

        code = f"MKT-FUND-{seller}".replace(" ", "-")[:40]
        listing = self.make_listing(seller, code, price=1160, stock=500)
        order = self.place_order(buyer, listing, qty)
        self.pay(order)
        seller_order = frappe.get_doc("Seller Order", {"marketplace_order": order.name})
        seller_order.accept()
        seller_order.mark_packed()
        seller_order.mark_shipped("FUND1")
        seller_order.mark_delivered()
        wallet.release_due_holds(add_days(today(), 8))
        return listing
