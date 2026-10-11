import frappe
from frappe import _

COLUMNS = [{'label': 'Shipment', 'fieldname': 'shipment', 'fieldtype': 'Link', 'options': 'Marketplace Shipment', 'width': 150},
 {'label': 'Courier', 'fieldname': 'courier', 'fieldtype': 'Link', 'options': 'Courier', 'width': 160},
 {'label': 'Seller Order', 'fieldname': 'seller_order', 'fieldtype': 'Link', 'options': 'Seller Order', 'width': 150},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 120},
 {'label': 'Delivered On', 'fieldname': 'delivered_on', 'fieldtype': 'Date', 'width': 110},
 {'label': 'COD Due', 'fieldname': 'cod_amount', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'COD Collected', 'fieldname': 'cod_collected', 'fieldtype': 'Currency', 'width': 130},
 {'label': 'Difference', 'fieldname': 'difference', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'Remitted', 'fieldname': 'cod_remitted', 'fieldtype': 'Check', 'width': 90}]
CONDITIONS = [('courier', 'sh.courier = %(courier)s'),
 ('status', 'sh.status = %(status)s'),
 ('remitted', 'sh.cod_remitted = %(remitted)s'),
 ('from_date', 'sh.creation::date >= %(from_date)s'),
 ('to_date', 'sh.creation::date <= %(to_date)s')]
FLAGS = []
BASE = ['sh.cod_amount > 0']


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
        select sh.name as shipment, sh.courier, sh.seller_order, sh.status, sh.delivered_on::date as delivered_on, sh.cod_amount, sh.cod_collected, sh.cod_collected - sh.cod_amount as difference, sh.cod_remitted
        from "tabMarketplace Shipment" sh
        {clause}
        
        order by sh.delivered_on desc nulls last
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
