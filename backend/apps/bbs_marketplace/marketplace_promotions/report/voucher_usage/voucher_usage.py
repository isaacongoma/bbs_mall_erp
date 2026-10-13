import frappe
from frappe import _

COLUMNS = [{'label': 'Voucher', 'fieldname': 'voucher', 'fieldtype': 'Link', 'options': 'Coupon Code', 'width': 180},
 {'label': 'Code', 'fieldname': 'code', 'fieldtype': 'Data', 'width': 130},
 {'label': 'Issued By', 'fieldname': 'seller', 'fieldtype': 'Link', 'options': 'Marketplace Seller', 'width': 170},
 {'label': 'Type', 'fieldname': 'voucher_type', 'fieldtype': 'Data', 'width': 130},
 {'label': 'Status', 'fieldname': 'voucher_status', 'fieldtype': 'Data', 'width': 110},
 {'label': 'Valid From', 'fieldname': 'valid_from', 'fieldtype': 'Date', 'width': 100},
 {'label': 'Valid Until', 'fieldname': 'valid_upto', 'fieldtype': 'Date', 'width': 100},
 {'label': 'Times Used', 'fieldname': 'used', 'fieldtype': 'Int', 'width': 100},
 {'label': 'Limit', 'fieldname': 'maximum_use', 'fieldtype': 'Int', 'width': 80},
 {'label': 'Total Discount Given', 'fieldname': 'voucher_total_discount', 'fieldtype': 'Currency', 'width': 160}]
CONDITIONS = [('seller', 'c.marketplace_seller = %(seller)s'),
 ('status', 'c.voucher_status = %(status)s'),
 ('voucher_type', 'c.voucher_type = %(voucher_type)s')]
FLAGS = []
BASE = ['c.voucher_marketplace = 1']


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
        select c.name as voucher, c.coupon_code as code, c.marketplace_seller as seller, c.voucher_type, c.voucher_status, c.valid_from, c.valid_upto, c.used, c.maximum_use, c.voucher_total_discount
        from "tabCoupon Code" c
        {clause}
        
        order by c.voucher_total_discount desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
