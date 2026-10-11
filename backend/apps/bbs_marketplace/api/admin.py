import frappe

from apps.bbs_marketplace.marketplace import wallet


@frappe.whitelist()
def wallet_summary(seller):
    frappe.has_permission("Marketplace Seller", "read", seller, throw=True)
    return wallet.balances(seller)
