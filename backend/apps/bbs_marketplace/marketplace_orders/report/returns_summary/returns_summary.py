import frappe
from frappe import _

COLUMNS = [{'label': 'Return', 'fieldname': 'return_request', 'fieldtype': 'Link', 'options': 'Return Request', 'width': 150},
 {'label': 'Requested', 'fieldname': 'requested_on', 'fieldtype': 'Date', 'width': 100},
 {'label': 'Order', 'fieldname': 'marketplace_order', 'fieldtype': 'Link', 'options': 'Marketplace Order', 'width': 150},
 {'label': 'Seller', 'fieldname': 'seller', 'fieldtype': 'Link', 'options': 'Marketplace Seller', 'width': 160},
 {'label': 'Customer', 'fieldname': 'customer', 'fieldtype': 'Link', 'options': 'Customer', 'width': 160},
 {'label': 'Reason', 'fieldname': 'reason', 'fieldtype': 'Data', 'width': 140},
 {'label': 'Resolution', 'fieldname': 'resolution', 'fieldtype': 'Data', 'width': 110},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 110},
 {'label': 'Seller Liable', 'fieldname': 'seller_liable', 'fieldtype': 'Check', 'width': 100},
 {'label': 'Refund', 'fieldname': 'refund_amount', 'fieldtype': 'Currency', 'width': 120}]
CONDITIONS = [('seller', 'r.seller = %(seller)s'),
 ('status', 'r.status = %(status)s'),
 ('reason', 'r.reason = %(reason)s'),
 ('from_date', 'r.creation::date >= %(from_date)s'),
 ('to_date', 'r.creation::date <= %(to_date)s')]
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
        select r.name as return_request, r.creation::date as requested_on, r.marketplace_order, r.seller, r.customer, r.reason, r.resolution, r.status, r.seller_liable, r.refund_amount
        from "tabReturn Request" r
        {clause}
        
        order by r.creation desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
