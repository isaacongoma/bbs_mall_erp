import re

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, now_datetime

from apps.bbs_marketplace.marketplace import wallet
from apps.bbs_marketplace.marketplace.utils import get_settings


class MarketplaceSeller(Document):
    doctype = "Marketplace Seller"

    def validate(self):
        self.set_slug()
        self.validate_customer()
        self.validate_payout_accounts()
        if self.status == "Active" and self.is_new() is False:
            self.check_can_activate()

    def set_slug(self):
        if not self.shop_slug:
            self.shop_slug = re.sub(r"[^a-z0-9]+", "-", (self.seller_name or "").lower()).strip("-")

    def validate_customer(self):
        if self.is_new():
            clash = frappe.db.get_value("Marketplace Seller", {"customer": self.customer, "name": ["!=", self.name]})
            if clash:
                frappe.throw(_("{0} is already a seller ({1})").format(self.customer, clash))

    def validate_payout_accounts(self):
        defaults = [row for row in self.payout_accounts if cint(row.is_default)]
        if len(defaults) > 1:
            frappe.throw(_("Only one payout account can be the default"))
        for row in self.payout_accounts:
            if row.method == "M-Pesa" and not row.mpesa_number:
                frappe.throw(_("Row {0}: enter the M-Pesa number").format(row.idx))
            if row.method == "Bank Transfer" and not row.bank_account:
                frappe.throw(_("Row {0}: choose the bank account").format(row.idx))

    def check_can_activate(self):
        before = self.get_doc_before_save()
        if before and before.status != "Active" and self.status == "Active":
            if self.seller_type == "Marketplace Seller" and not self.customer:
                frappe.throw(_("A seller needs a tenant customer record"))
            self.approved_by = frappe.session.user
            self.approved_on = now_datetime()

    def before_insert(self):
        self.ensure_supplier()

    def after_insert(self):
        self.ensure_warehouse()
        frappe.db.set_value("Customer", self.customer, "marketplace_seller", self.name, update_modified=False)

    def ensure_supplier(self):
        if self.supplier:
            return
        name = f"{self.seller_name} (Marketplace)"
        existing = frappe.db.get_value("Supplier", {"supplier_name": name})
        if existing:
            self.supplier = existing
            return
        supplier = frappe.get_doc(
            {
                "doctype": "Supplier",
                "supplier_name": name,
                "supplier_group": frappe.db.get_value("Supplier Group", {"is_group": 0}) or "All Supplier Groups",
                "supplier_type": "Company",
                "tax_id": frappe.db.get_value("Customer", self.customer, "tax_id"),
                "country": frappe.db.get_value("Company", get_settings().company, "country"),
            }
        )
        supplier.flags.ignore_permissions = True
        supplier.insert()
        self.supplier = supplier.name

    def ensure_warehouse(self):
        if self.warehouse:
            return
        company = get_settings().company
        abbr = frappe.get_cached_value("Company", company, "abbr")
        name = f"Marketplace - {self.seller_name}"
        if not frappe.db.exists("Warehouse", {"warehouse_name": name, "company": company}):
            parent = frappe.db.get_value("Warehouse", {"company": company, "is_group": 1, "parent_warehouse": ["in", ["", None]]})
            doc = frappe.get_doc({"doctype": "Warehouse", "warehouse_name": name, "company": company, "parent_warehouse": parent, "marketplace_seller": self.name})
            doc.flags.ignore_permissions = True
            doc.insert()
            warehouse = doc.name
        else:
            warehouse = frappe.db.get_value("Warehouse", {"warehouse_name": name, "company": company})
        frappe.db.set_value("Marketplace Seller", self.name, "warehouse", warehouse, update_modified=False)
        self.warehouse = warehouse

    def on_update(self):
        if self.status in ("Suspended", "Closed", "Rejected"):
            frappe.db.sql(
                'update "tabMarketplace Listing" set status = \'Paused\' where seller = %s and status = \'Published\'',
                self.name,
            )

    @frappe.whitelist()
    def refresh_wallet(self):
        self.check_permission("write")
        return wallet.refresh_seller_balances(self.name)

    def has_verified_payout_account(self):
        return any(cint(row.verified) for row in self.payout_accounts)
