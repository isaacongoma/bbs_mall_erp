import frappe
from frappe import _

COLUMNS = [{'label': 'Courier', 'fieldname': 'courier', 'fieldtype': 'Link', 'options': 'Courier', 'width': 180},
 {'label': 'Shipments', 'fieldname': 'shipments', 'fieldtype': 'Int', 'width': 100},
 {'label': 'Delivered', 'fieldname': 'delivered', 'fieldtype': 'Int', 'width': 100},
 {'label': 'Failed', 'fieldname': 'failed', 'fieldtype': 'Int', 'width': 90},
 {'label': 'Returned', 'fieldname': 'returned', 'fieldtype': 'Int', 'width': 100},
 {'label': 'Delivery Rate %', 'fieldname': 'delivery_rate', 'fieldtype': 'Percent', 'width': 120},
 {'label': 'Avg Days to Deliver', 'fieldname': 'avg_days', 'fieldtype': 'Float', 'width': 140},
 {'label': 'Courier Cost', 'fieldname': 'courier_cost', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'Delivery Fees Charged', 'fieldname': 'customer_fee', 'fieldtype': 'Currency', 'width': 150}]
CONDITIONS = [('courier', 'sh.courier = %(courier)s'),
 ('from_date', 'sh.creation::date >= %(from_date)s'),
 ('to_date', 'sh.creation::date <= %(to_date)s')]
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
        select sh.courier, count(*) as shipments, sum(case when sh.status = 'Delivered' then 1 else 0 end) as delivered, sum(case when sh.status = 'Failed Delivery' then 1 else 0 end) as failed, sum(case when sh.status in ('Returning', 'Returned to Seller') then 1 else 0 end) as returned, round(100.0 * sum(case when sh.status = 'Delivered' then 1 else 0 end) / nullif(count(*), 0), 2) as delivery_rate, round(avg(case when sh.status = 'Delivered' and sh.picked_up_on is not null and sh.delivered_on is not null then extract(epoch from (sh.delivered_on::timestamp - sh.picked_up_on::timestamp)) / 86400 end)::numeric, 2) as avg_days, coalesce(sum(sh.courier_cost), 0) as courier_cost, coalesce(sum(sh.customer_fee), 0) as customer_fee
        from "tabMarketplace Shipment" sh
        {clause}
        group by sh.courier
        order by shipments desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
