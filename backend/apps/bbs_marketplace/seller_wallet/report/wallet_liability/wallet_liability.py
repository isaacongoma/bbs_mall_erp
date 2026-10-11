import frappe
from frappe import _
from frappe.utils import flt

from apps.bbs_marketplace.marketplace import wallet


def execute(filters=None):
    filters = frappe._dict(filters or {})
    params = {}
    where = []
    if filters.status:
        where.append("s.status = %(status)s")
        params["status"] = filters.status
    clause = ("where " + " and ".join(where)) if where else ""
    sellers = frappe.db.sql(
        f"""
        select s.name as seller, s.status, s.supplier, s.wallet_balance, s.pending_balance, s.available_balance
        from "tabMarketplace Seller" s
        {clause}
        order by s.wallet_balance desc
        """,
        params,
        as_dict=True,
    )
    for row in sellers:
        row["ledger_balance"] = flt(wallet.gl_balance(row["seller"]), 2)
        row["difference"] = flt(row["ledger_balance"] - flt(row["wallet_balance"]), 2)
    columns = [
        {"label": _("Seller"), "fieldname": "seller", "fieldtype": "Link", "options": "Marketplace Seller", "width": 180},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
        {"label": _("Wallet Supplier"), "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 160},
        {"label": _("Wallet Balance"), "fieldname": "wallet_balance", "fieldtype": "Currency", "width": 130},
        {"label": _("On Hold"), "fieldname": "pending_balance", "fieldtype": "Currency", "width": 120},
        {"label": _("Available"), "fieldname": "available_balance", "fieldtype": "Currency", "width": 120},
        {"label": _("Ledger Balance"), "fieldname": "ledger_balance", "fieldtype": "Currency", "width": 130},
        {"label": _("Difference"), "fieldname": "difference", "fieldtype": "Currency", "width": 110},
    ]
    return columns, sellers
