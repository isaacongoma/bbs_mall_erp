import frappe
from frappe import _

COLUMNS = [{'label': 'Listing', 'fieldname': 'listing', 'fieldtype': 'Link', 'options': 'Marketplace Listing', 'width': 140},
 {'label': 'Title', 'fieldname': 'listing_title', 'fieldtype': 'Data', 'width': 220},
 {'label': 'Seller', 'fieldname': 'seller', 'fieldtype': 'Link', 'options': 'Marketplace Seller', 'width': 160},
 {'label': 'Item', 'fieldname': 'item', 'fieldtype': 'Link', 'options': 'Item', 'width': 140},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 110},
 {'label': 'In Stock', 'fieldname': 'stock_qty', 'fieldtype': 'Float', 'width': 100},
 {'label': 'Reserved', 'fieldname': 'reserved_qty', 'fieldtype': 'Float', 'width': 100},
 {'label': 'Available', 'fieldname': 'available_qty', 'fieldtype': 'Float', 'width': 100},
 {'label': 'Low Stock At', 'fieldname': 'low_stock_threshold', 'fieldtype': 'Float', 'width': 110},
 {'label': 'Stock Level', 'fieldname': 'level', 'fieldtype': 'Data', 'width': 110}]
CONDITIONS = [('seller', 'l.seller = %(seller)s'), ('status', 'l.status = %(status)s'), ('low_stock_only', 'l.available_qty <= l.low_stock_threshold')]
FLAGS = ['low_stock_only']
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
        select l.name as listing, l.listing_title, l.seller, l.item, l.status, l.stock_qty, l.reserved_qty, l.available_qty, l.low_stock_threshold, case when l.available_qty <= 0 then 'Out of Stock' when l.available_qty <= l.low_stock_threshold then 'Low' else 'OK' end as level
        from "tabMarketplace Listing" l
        {clause}
        
        order by l.available_qty asc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
