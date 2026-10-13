import json
import os

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

ROLES = {
    "Marketplace Manager": {"desk_access": 1},
    "Marketplace Operations": {"desk_access": 1},
    "Marketplace Finance": {"desk_access": 1},
    "Catalog Moderator": {"desk_access": 1},
}

ACCOUNTS = {
    "customer_advance_account": ("Marketplace Customer Receipts Held", ("Current Liabilities",), "Receivable", "Liability"),
    "seller_wallet_account": ("Seller Wallet Payable", ("Current Liabilities",), "Payable", "Liability"),
    "payouts_in_transit_account": ("Seller Payouts in Transit", ("Current Liabilities",), "", "Liability"),
    "refund_clearing_account": ("Marketplace Refunds Clearing", ("Current Liabilities",), "", "Liability"),
    "commission_income_account": ("Marketplace Commission Income", ("Direct Income", "Indirect Income", "Income"), "Income Account", "Income"),
    "shipping_income_account": ("Marketplace Delivery Fee Income", ("Direct Income", "Indirect Income", "Income"), "Income Account", "Income"),
    "withdrawal_fee_account": ("Marketplace Withdrawal Fee Income", ("Indirect Income", "Direct Income", "Income"), "Income Account", "Income"),
    "subscription_income_account": ("Marketplace Subscription Income", ("Indirect Income", "Direct Income", "Income"), "Income Account", "Income"),
    "advertising_income_account": ("Marketplace Advertising Income", ("Indirect Income", "Direct Income", "Income"), "Income Account", "Income"),
    "marketing_expense_account": ("Marketplace Promotion Expense", ("Indirect Expenses", "Expenses"), "Expense Account", "Expense"),
}

CLEARING = {
    "M-Pesa": ("Marketplace M-Pesa Clearing", "Mpesa"),
    "Card": ("Marketplace Card Clearing", "Credit Card"),
    "Cash on Delivery": ("Marketplace COD Clearing", "Cash"),
    "Bank Transfer": ("Marketplace Bank Receipts", "Bank Transfer"),
}


def custom_fields():
    return {
        "Item Group": [
            {"fieldname": "marketplace_section", "fieldtype": "Section Break", "label": "Marketplace", "insert_after": "parent_item_group", "collapsible": 1},
            {"fieldname": "marketplace_visible", "fieldtype": "Check", "label": "Show in Marketplace", "insert_after": "marketplace_section", "default": "1"},
            {"fieldname": "marketplace_icon", "fieldtype": "Attach Image", "label": "Category Icon", "insert_after": "marketplace_visible"},
            {"fieldname": "marketplace_banner", "fieldtype": "Attach Image", "label": "Category Banner", "insert_after": "marketplace_icon"},
            {"fieldname": "marketplace_column", "fieldtype": "Column Break", "insert_after": "marketplace_banner"},
            {"fieldname": "marketplace_sort_order", "fieldtype": "Int", "label": "Marketplace Order", "insert_after": "marketplace_column"},
            {"fieldname": "marketplace_commission", "fieldtype": "Percent", "label": "Commission %", "insert_after": "marketplace_sort_order", "description": "Overrides the default commission for this category"},
            {"fieldname": "marketplace_return_days", "fieldtype": "Int", "label": "Return Window (days)", "insert_after": "marketplace_commission"},
            {"fieldname": "marketplace_attributes_section", "fieldtype": "Section Break", "label": "Marketplace Attributes", "insert_after": "marketplace_return_days", "collapsible": 1},
            {"fieldname": "marketplace_attributes", "fieldtype": "Table", "label": "Product Attributes", "options": "Category Attribute", "insert_after": "marketplace_attributes_section", "description": "Attributes sellers fill in for products in this category. Mark the ones buyers choose between to create variants"},
        ],
        "Item": [
            {"fieldname": "marketplace_section", "fieldtype": "Section Break", "label": "Marketplace", "insert_after": "description", "collapsible": 1},
            {"fieldname": "marketplace_seller", "fieldtype": "Link", "label": "Marketplace Seller", "options": "Marketplace Seller", "insert_after": "marketplace_section", "in_standard_filter": 1, "read_only": 1, "no_copy": 1},
            {"fieldname": "marketplace_listing", "fieldtype": "Link", "label": "Marketplace Listing", "options": "Marketplace Listing", "insert_after": "marketplace_seller", "read_only": 1, "no_copy": 1},
        ],
        "Customer": [
            {"fieldname": "marketplace_section", "fieldtype": "Section Break", "label": "Marketplace", "insert_after": "tax_id", "collapsible": 1},
            {"fieldname": "marketplace_buyer_type", "fieldtype": "Select", "label": "Marketplace Buyer Type", "options": "\nB2C\nB2B", "insert_after": "marketplace_section", "in_standard_filter": 1},
            {"fieldname": "marketplace_user", "fieldtype": "Link", "label": "Storefront Login", "options": "User", "insert_after": "marketplace_buyer_type", "no_copy": 1},
            {"fieldname": "marketplace_seller", "fieldtype": "Link", "label": "Marketplace Seller", "options": "Marketplace Seller", "insert_after": "marketplace_user", "read_only": 1, "no_copy": 1},
        ],
        "Sales Invoice": [
            {"fieldname": "marketplace_order", "fieldtype": "Link", "label": "Marketplace Order", "options": "Marketplace Order", "insert_after": "po_no", "read_only": 1, "no_copy": 1, "search_index": 1},
        ],
        "Coupon Code": [
            {"fieldname": "voucher_marketplace", "fieldtype": "Check", "label": "Marketplace Voucher", "insert_after": "coupon_type", "in_standard_filter": 1, "description": "Applies to marketplace orders using the rules below. Valid Until is required"},
            {"fieldname": "marketplace_campaign", "fieldtype": "Link", "label": "Marketplace Campaign", "options": "Marketplace Campaign", "insert_after": "voucher_marketplace"},
            {"fieldname": "marketplace_seller", "fieldtype": "Link", "label": "Seller Funded By", "options": "Marketplace Seller", "insert_after": "marketplace_campaign", "in_standard_filter": 1, "description": "The seller who issued and pays for this voucher. Leave blank when BBS Mall funds it"},
            {"fieldname": "voucher_section", "fieldtype": "Section Break", "label": "Marketplace Voucher Rules", "insert_after": "description", "depends_on": "eval:doc.voucher_marketplace"},
            {"fieldname": "voucher_status", "fieldtype": "Select", "label": "Voucher Status", "options": "Active\nPaused\nPending Approval", "default": "Active", "insert_after": "voucher_section", "in_standard_filter": 1},
            {"fieldname": "voucher_type", "fieldtype": "Select", "label": "Voucher Type", "options": "Discount\nDelivery Discount", "default": "Discount", "insert_after": "voucher_status"},
            {"fieldname": "voucher_discount_type", "fieldtype": "Select", "label": "Discount Type", "options": "Percent\nFixed Amount", "default": "Percent", "insert_after": "voucher_type"},
            {"fieldname": "voucher_discount_value", "fieldtype": "Float", "label": "Discount Value", "insert_after": "voucher_discount_type", "description": "A percentage, or an amount. For a free delivery voucher use 100 percent"},
            {"fieldname": "voucher_max_discount", "fieldtype": "Currency", "label": "Maximum Discount", "insert_after": "voucher_discount_value", "description": "Caps a percentage voucher. Leave 0 for no cap"},
            {"fieldname": "voucher_min_order", "fieldtype": "Currency", "label": "Minimum Spend", "insert_after": "voucher_max_discount", "description": "Spend on the eligible items needed to use this voucher"},
            {"fieldname": "voucher_column", "fieldtype": "Column Break", "insert_after": "voucher_min_order"},
            {"fieldname": "voucher_applies_to", "fieldtype": "Select", "label": "Applies To", "options": "All Items\nSelected Products\nCategory\nBrand", "default": "All Items", "insert_after": "voucher_column"},
            {"fieldname": "voucher_item_group", "fieldtype": "Link", "label": "Category", "options": "Item Group", "insert_after": "voucher_applies_to", "depends_on": "eval:doc.voucher_applies_to=='Category'"},
            {"fieldname": "voucher_brand", "fieldtype": "Link", "label": "Brand", "options": "Brand", "insert_after": "voucher_item_group", "depends_on": "eval:doc.voucher_applies_to=='Brand'"},
            {"fieldname": "voucher_buyer_type", "fieldtype": "Select", "label": "Buyers", "options": "Both\nB2C\nB2B", "default": "Both", "insert_after": "voucher_brand"},
            {"fieldname": "voucher_payment_method", "fieldtype": "Select", "label": "Only When Paying With", "options": "\nM-Pesa\nCard\nBank Transfer\nCash on Delivery\nWallet\nCredit Terms\nAirtel Money", "insert_after": "voucher_buyer_type"},
            {"fieldname": "voucher_limits_section", "fieldtype": "Section Break", "label": "Limits and Visibility", "insert_after": "voucher_payment_method", "depends_on": "eval:doc.voucher_marketplace"},
            {"fieldname": "voucher_per_customer_limit", "fieldtype": "Int", "label": "Uses per Customer", "default": "1", "insert_after": "voucher_limits_section", "description": "0 means unlimited"},
            {"fieldname": "voucher_first_order_only", "fieldtype": "Check", "label": "New Customers Only", "insert_after": "voucher_per_customer_limit"},
            {"fieldname": "voucher_exclude_campaign_items", "fieldtype": "Check", "label": "Exclude Items Already on Promotion", "insert_after": "voucher_first_order_only"},
            {"fieldname": "voucher_limits_column", "fieldtype": "Column Break", "insert_after": "voucher_exclude_campaign_items"},
            {"fieldname": "voucher_show_on_shop", "fieldtype": "Check", "label": "Show on Shop and Product Pages", "default": "1", "insert_after": "voucher_limits_column"},
            {"fieldname": "voucher_must_collect", "fieldtype": "Check", "label": "Customers Collect First", "insert_after": "voucher_show_on_shop", "description": "Shoppers press Collect to add it to their vouchers before they can use it"},
            {"fieldname": "voucher_total_discount", "fieldtype": "Currency", "label": "Total Given", "read_only": 1, "no_copy": 1, "insert_after": "voucher_must_collect"},
            {"fieldname": "voucher_products_section", "fieldtype": "Section Break", "label": "Selected Products", "insert_after": "voucher_total_discount", "depends_on": "eval:doc.voucher_marketplace && doc.voucher_applies_to=='Selected Products'"},
            {"fieldname": "voucher_products", "fieldtype": "Table", "label": "Products", "options": "Voucher Product", "insert_after": "voucher_products_section"},
        ],
        "Journal Entry": [
            {"fieldname": "marketplace_reference", "fieldtype": "Data", "label": "Marketplace Reference", "insert_after": "user_remark", "read_only": 1, "no_copy": 1, "search_index": 1},
        ],
        "Issue": [
            {"fieldname": "marketplace_order", "fieldtype": "Link", "label": "Marketplace Order", "options": "Marketplace Order", "insert_after": "customer", "no_copy": 1},
        ],
        "Warehouse": [
            {"fieldname": "marketplace_seller", "fieldtype": "Link", "label": "Marketplace Seller", "options": "Marketplace Seller", "insert_after": "warehouse_type", "read_only": 1, "no_copy": 1},
        ],
    }


def ensure_module_defs():
    path = os.path.join(os.path.dirname(__file__), "modules.txt")
    with open(path, encoding="utf-8") as handle:
        names = [line.strip() for line in handle if line.strip()]
    for name in names:
        if not frappe.db.exists("Module Def", name):
            frappe.get_doc({"doctype": "Module Def", "module_name": name, "app_name": "bbs_marketplace", "name": name}).insert(ignore_permissions=True)


def ensure_roles():
    for name, values in ROLES.items():
        if not frappe.db.exists("Role", name):
            frappe.get_doc({"doctype": "Role", "role_name": name, **values}).insert(ignore_permissions=True)


def default_company():
    return frappe.defaults.get_global_default("company") or frappe.db.get_value("Company", {})


def parent_account(company, names, root_type):
    for name in names:
        found = frappe.db.get_value("Account", {"company": company, "account_name": name, "is_group": 1}, "name")
        if found:
            return found
    return frappe.db.get_value("Account", {"company": company, "root_type": root_type, "is_group": 1, "parent_account": ["in", ["", None]]}, "name")


def ensure_account(company, name, parents, account_type, root_type):
    abbr = frappe.get_cached_value("Company", company, "abbr")
    existing = frappe.db.get_value("Account", {"company": company, "account_name": name}, "name")
    if existing:
        return existing
    parent = parent_account(company, parents, root_type)
    if not parent:
        return None
    doc = frappe.get_doc(
        {
            "doctype": "Account",
            "account_name": name,
            "company": company,
            "parent_account": parent,
            "is_group": 0,
            "root_type": root_type,
            "account_type": account_type or "",
        }
    )
    doc.insert(ignore_permissions=True)
    return doc.name


def ensure_mode_of_payment(name, kind):
    if frappe.db.exists("Mode of Payment", name):
        return name
    frappe.get_doc({"doctype": "Mode of Payment", "mode_of_payment": name, "type": kind if kind in ("Cash", "Bank", "General", "Phone") else "General"}).insert(ignore_permissions=True)
    return name


def ensure_price_list(name, selling=1):
    if frappe.db.exists("Price List", name):
        return name
    currency = frappe.db.get_value("Company", default_company(), "default_currency") if default_company() else None
    frappe.get_doc({"doctype": "Price List", "price_list_name": name, "currency": currency, "selling": selling, "enabled": 1}).insert(ignore_permissions=True)
    return name


def ensure_delivery_zone(settings):
    if frappe.db.exists("Delivery Zone", "Nairobi"):
        return "Nairobi"
    frappe.get_doc(
        {
            "doctype": "Delivery Zone",
            "zone_name": "Nairobi",
            "enabled": 1,
            "areas": [{"county": "Nairobi"}],
        }
    ).insert(ignore_permissions=True)
    return "Nairobi"


def ensure_defaults(settings):
    company = settings.company
    changed = False
    for field, (name, parents, account_type, root_type) in ACCOUNTS.items():
        if not settings.get(field):
            account = ensure_account(company, name, parents, account_type, root_type)
            if account:
                settings.set(field, account)
                changed = True
    if not settings.get("output_vat_account"):
        vat = frappe.db.get_value("Account", {"company": company, "account_type": "Tax", "is_group": 0, "account_name": ["like", "%VAT%"]}, "name") or frappe.db.get_value(
            "Account", {"company": company, "account_type": "Tax", "is_group": 0}, "name"
        )
        if vat:
            settings.output_vat_account = vat
            changed = True
    if not settings.get("price_list_b2c"):
        settings.price_list_b2c = ensure_price_list("Marketplace Retail")
        changed = True
    if not settings.get("price_list_b2b"):
        settings.price_list_b2b = ensure_price_list("Marketplace Wholesale")
        changed = True
    if not settings.get("cost_center") or frappe.db.get_value("Cost Center", settings.cost_center, "company") != company:
        settings.cost_center = frappe.get_cached_value("Company", company, "cost_center")
        changed = True
    if not settings.get("default_delivery_zone"):
        settings.default_delivery_zone = ensure_delivery_zone(settings)
        changed = True
    if not settings.get("payment_methods"):
        for method, (account_name, mop_type) in CLEARING.items():
            parents = ("Current Assets",)
            account = ensure_account(company, account_name, parents, "Bank" if method != "Cash on Delivery" else "Cash", "Asset")
            settings.append(
                "payment_methods",
                {
                    "method": method,
                    "enabled": 1,
                    "audience": "Both",
                    "mode_of_payment": ensure_mode_of_payment(f"Marketplace {method}", mop_type),
                    "clearing_account": account,
                },
            )
        settings.append("payment_methods", {"method": "Wallet", "enabled": 1, "audience": "Both"})
        settings.append("payment_methods", {"method": "Credit Terms", "enabled": 1, "audience": "B2B"})
        changed = True
    return changed


def ensure_settings():
    company = default_company()
    if not company:
        return
    settings = frappe.get_single("Marketplace Settings")
    if not settings.company:
        settings.company = company
    changed = ensure_defaults(settings)
    if changed or not settings.modified:
        settings.save(ignore_permissions=True)
    ensure_platform_seller(settings)
    ensure_default_commission_rule()
    ensure_notification_templates()
    ensure_default_plan()
    ensure_size_charts()
    ensure_newsletter_group()


def ensure_platform_seller(settings):
    if settings.get("platform_seller") or not settings.company:
        return
    customer = settings.company
    if not frappe.db.exists("Customer", customer):
        return
    seller = frappe.get_doc(
        {
            "doctype": "Marketplace Seller",
            "seller_name": "BBS Mall",
            "customer": customer,
            "seller_type": "BBS Mall Own Stock",
            "status": "Active",
            "kyc_status": "Verified",
            "fulfilment_mode": "Platform Fulfils",
        }
    )
    seller.flags.ignore_permissions = True
    seller.insert()
    settings.platform_seller = seller.name
    settings.save(ignore_permissions=True)


def ensure_default_commission_rule():
    if frappe.db.exists("Commission Rule", "Marketplace Default"):
        return
    frappe.get_doc({"doctype": "Commission Rule", "title": "Marketplace Default", "name": "Marketplace Default", "enabled": 1, "applies_to": "Everything", "priority": 0, "rate_percent": 10}).insert(ignore_permissions=True)


def ensure_notification_templates():
    from apps.bbs_marketplace.marketplace.notification_defaults import TEMPLATES

    for event, audience, subject, body, sms in TEMPLATES:
        if frappe.db.exists("Marketplace Notification Template", event):
            continue
        frappe.get_doc(
            {
                "doctype": "Marketplace Notification Template",
                "event_name": event,
                "audience": audience,
                "enabled": 1,
                "send_email": 1,
                "send_sms": 1,
                "email_subject": subject,
                "email_body": body,
                "sms_body": sms,
            }
        ).insert(ignore_permissions=True)


def ensure_size_charts():
    from apps.bbs_marketplace.size_chart_defaults import CHARTS

    for chart in CHARTS:
        if frappe.db.exists("Marketplace Size Chart", chart["chart_name"]):
            continue
        frappe.get_doc({"doctype": "Marketplace Size Chart", **chart}).insert(ignore_permissions=True)


def ensure_default_plan():
    if frappe.db.exists("Seller Plan", "Free"):
        return
    frappe.get_doc({"doctype": "Seller Plan", "plan_name": "Free", "enabled": 1, "is_default": 1, "monthly_fee": 0, "annual_fee": 0, "listing_limit": 50, "description": "Start selling at no monthly cost"}).insert(ignore_permissions=True)


def ensure_newsletter_group():
    if frappe.db.exists("DocType", "Email Group") and not frappe.db.exists("Email Group", "Marketplace Newsletter"):
        frappe.get_doc({"doctype": "Email Group", "title": "Marketplace Newsletter"}).insert(ignore_permissions=True)


def register_app():
    installed = json.loads(frappe.db.get_global("installed_apps") or "[]")
    if "bbs_marketplace" not in installed:
        installed.append("bbs_marketplace")
        frappe.db.set_global("installed_apps", json.dumps(installed))


def after_install():
    ensure_module_defs()
    ensure_roles()
    create_custom_fields(custom_fields(), ignore_validate=True)
    ensure_settings()
    register_app()


def after_migrate():
    ensure_module_defs()
    ensure_roles()
    create_custom_fields(custom_fields(), ignore_validate=True)
