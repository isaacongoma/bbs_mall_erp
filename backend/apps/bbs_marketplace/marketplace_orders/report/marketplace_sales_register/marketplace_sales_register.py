import frappe
from frappe import _

COLUMNS = [{'label': 'Order', 'fieldname': 'order', 'fieldtype': 'Link', 'options': 'Marketplace Order', 'width': 150},
 {'label': 'Date', 'fieldname': 'order_date', 'fieldtype': 'Date', 'width': 100},
 {'label': 'Customer', 'fieldname': 'customer', 'fieldtype': 'Link', 'options': 'Customer', 'width': 170},
 {'label': 'Buyer', 'fieldname': 'buyer_type', 'fieldtype': 'Data', 'width': 70},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 120},
 {'label': 'Payment', 'fieldname': 'payment_status', 'fieldtype': 'Data', 'width': 100},
 {'label': 'Method', 'fieldname': 'payment_method', 'fieldtype': 'Data', 'width': 110},
 {'label': 'Subtotal', 'fieldname': 'subtotal', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'VAT', 'fieldname': 'vat_total', 'fieldtype': 'Currency', 'width': 110},
 {'label': 'Discount', 'fieldname': 'discount_total', 'fieldtype': 'Currency', 'width': 110},
 {'label': 'Delivery', 'fieldname': 'shipping_total', 'fieldtype': 'Currency', 'width': 110},
 {'label': 'Grand Total', 'fieldname': 'grand_total', 'fieldtype': 'Currency', 'width': 130},
 {'label': 'Paid', 'fieldname': 'paid_amount', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'Outstanding', 'fieldname': 'outstanding_amount', 'fieldtype': 'Currency', 'width': 120}]
CONDITIONS = [('company', 'o.company = %(company)s'),
 ('from_date', 'o.order_date::date >= %(from_date)s'),
 ('to_date', 'o.order_date::date <= %(to_date)s'),
 ('customer', 'o.customer = %(customer)s'),
 ('buyer_type', 'o.buyer_type = %(buyer_type)s'),
 ('status', 'o.status = %(status)s'),
 ('payment_status', 'o.payment_status = %(payment_status)s'),
 ('payment_method', 'o.payment_method = %(payment_method)s')]
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
        select o.name as order, o.order_date::date as order_date, o.customer, o.buyer_type, o.status, o.payment_status, o.payment_method, o.subtotal, o.vat_total, o.discount_total, o.shipping_total, o.grand_total, o.paid_amount, o.outstanding_amount
        from "tabMarketplace Order" o
        {clause}
        
        order by o.order_date desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
