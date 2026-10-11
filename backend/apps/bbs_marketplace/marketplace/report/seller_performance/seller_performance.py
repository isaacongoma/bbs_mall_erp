import frappe
from frappe import _

COLUMNS = [{'label': 'Seller', 'fieldname': 'seller', 'fieldtype': 'Link', 'options': 'Marketplace Seller', 'width': 180},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 110},
 {'label': 'KYC', 'fieldname': 'kyc_status', 'fieldtype': 'Data', 'width': 100},
 {'label': 'Orders', 'fieldname': 'total_orders', 'fieldtype': 'Int', 'width': 90},
 {'label': 'Sales', 'fieldname': 'total_sales', 'fieldtype': 'Currency', 'width': 130},
 {'label': 'Fulfilment %', 'fieldname': 'fulfilment_rate', 'fieldtype': 'Percent', 'width': 110},
 {'label': 'Cancel %', 'fieldname': 'cancel_rate', 'fieldtype': 'Percent', 'width': 100},
 {'label': 'Return %', 'fieldname': 'return_rate', 'fieldtype': 'Percent', 'width': 100},
 {'label': 'Rating', 'fieldname': 'rating', 'fieldtype': 'Float', 'width': 80},
 {'label': 'Wallet Balance', 'fieldname': 'wallet_balance', 'fieldtype': 'Currency', 'width': 130}]
CONDITIONS = [('status', 's.status = %(status)s'), ('kyc_status', 's.kyc_status = %(kyc_status)s'), ('seller', 's.name = %(seller)s')]
FLAGS = []
BASE = []


def execute(filters=None):
    filters = frappe._dict(filters or {})
    where = list(BASE)
    params = {}
    for name, fragment in CONDITIONS:
        value = filters.get(name)
        if name in FLAGS:
            if value:
                where.append(fragment)
        elif value not in (None, ""):
            where.append(fragment)
            params[name] = value
    clause = ("where " + " and ".join(where)) if where else ""
    data = frappe.db.sql(
        f"""
        select s.name as seller, s.status, s.kyc_status, s.total_orders, s.total_sales, s.fulfilment_rate, s.cancel_rate, s.return_rate, s.rating, s.wallet_balance
        from "tabMarketplace Seller" s
        {clause}
        
        order by s.total_sales desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
