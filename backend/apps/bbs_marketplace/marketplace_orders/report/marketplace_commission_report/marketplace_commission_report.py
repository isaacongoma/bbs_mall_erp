import frappe
from frappe import _

COLUMNS = [{'label': 'Seller Order', 'fieldname': 'seller_order', 'fieldtype': 'Link', 'options': 'Seller Order', 'width': 150},
 {'label': 'Order', 'fieldname': 'marketplace_order', 'fieldtype': 'Link', 'options': 'Marketplace Order', 'width': 150},
 {'label': 'Seller', 'fieldname': 'seller', 'fieldtype': 'Link', 'options': 'Marketplace Seller', 'width': 170},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 100},
 {'label': 'Settlement', 'fieldname': 'settlement_status', 'fieldtype': 'Data', 'width': 110},
 {'label': 'Settled On', 'fieldname': 'settled_on', 'fieldtype': 'Date', 'width': 100},
 {'label': 'Items Total', 'fieldname': 'items_total', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'Commission %', 'fieldname': 'commission_rate', 'fieldtype': 'Percent', 'width': 110},
 {'label': 'Commission', 'fieldname': 'commission_amount', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'VAT on Commission', 'fieldname': 'commission_vat', 'fieldtype': 'Currency', 'width': 130},
 {'label': 'Seller Net', 'fieldname': 'seller_net', 'fieldtype': 'Currency', 'width': 120}]
CONDITIONS = [('seller', 'so.seller = %(seller)s'),
 ('settlement_status', 'so.settlement_status = %(settlement_status)s'),
 ('from_date', 'so.creation::date >= %(from_date)s'),
 ('to_date', 'so.creation::date <= %(to_date)s')]
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
        select so.name as seller_order, so.marketplace_order, so.seller, so.status, so.settlement_status, so.settled_on, so.items_total, so.commission_rate, so.commission_amount, so.commission_vat, so.seller_net
        from "tabSeller Order" so
        {clause}
        
        order by so.creation desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
