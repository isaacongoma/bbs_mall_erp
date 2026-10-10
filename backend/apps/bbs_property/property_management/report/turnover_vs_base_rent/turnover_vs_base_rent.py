import frappe
from frappe import _
from frappe.utils import add_months, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    to_date = getdate(filters.to_date or nowdate())
    from_date = getdate(filters.from_date or add_months(to_date.replace(day=1), -11))
    params = {"from_date": from_date, "to_date": to_date}
    where = ["d.status in ('Approved', 'Billed')", "d.period_end >= %(from_date)s", "d.period_start <= %(to_date)s"]
    if filters.property:
        where.append("d.property = %(property)s")
        params["property"] = filters.property
    if filters.customer:
        where.append("d.customer = %(customer)s")
        params["customer"] = filters.customer
    data = frappe.db.sql(
        f"""
        select d.lease, d.customer, d.property, d.turnover_rent_percent as percent,
               sum(d.gross_sales) as sales, sum(d.base_rent_for_period) as base_rent,
               sum(d.turnover_rent_due) as turnover_rent,
               count(*) as declarations,
               coalesce(a.area, 0) as area
        from "tabTenant Sales Declaration" d
        left join (select parent, sum(area_sqm) as area from "tabLease Unit" group by parent) a on a.parent = d.lease
        where {" and ".join(where)}
        group by d.lease, d.customer, d.property, d.turnover_rent_percent, a.area
        order by sales desc
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["sales_per_sqm"] = flt(row.sales) / flt(row.area) if flt(row.area) else 0
        row["effective_rate"] = flt((flt(row.base_rent) + flt(row.turnover_rent)) * 100.0 / flt(row.sales), 2) if flt(row.sales) else 0
    chart = {
        "data": {
            "labels": [row.customer for row in data[:10]],
            "datasets": [
                {"name": _("Base Rent"), "values": [flt(row.base_rent) for row in data[:10]]},
                {"name": _("Turnover Rent"), "values": [flt(row.turnover_rent) for row in data[:10]]},
            ],
        },
        "type": "bar",
        "stacked": 1,
    } if data else None
    summary = [
        {"label": _("Declared Sales"), "value": sum(flt(row.sales) for row in data), "indicator": "blue", "datatype": "Currency"},
        {"label": _("Turnover Rent"), "value": sum(flt(row.turnover_rent) for row in data), "indicator": "green", "datatype": "Currency"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    return [
        {"label": _("Lease"), "fieldname": "lease", "fieldtype": "Link", "options": "Lease Agreement", "width": 140},
        {"label": _("Tenant"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 170},
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Turnover %"), "fieldname": "percent", "fieldtype": "Percent", "width": 100},
        {"label": _("Declarations"), "fieldname": "declarations", "fieldtype": "Int", "width": 100},
        {"label": _("Declared Sales"), "fieldname": "sales", "fieldtype": "Currency", "width": 130},
        {"label": _("Sales / sqm"), "fieldname": "sales_per_sqm", "fieldtype": "Currency", "width": 110},
        {"label": _("Base Rent"), "fieldname": "base_rent", "fieldtype": "Currency", "width": 130},
        {"label": _("Turnover Rent"), "fieldname": "turnover_rent", "fieldtype": "Currency", "width": 130},
        {"label": _("Effective Rent % of Sales"), "fieldname": "effective_rate", "fieldtype": "Percent", "width": 170},
    ]
