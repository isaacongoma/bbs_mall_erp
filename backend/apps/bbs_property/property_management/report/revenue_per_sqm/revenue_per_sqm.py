import frappe
from frappe import _
from frappe.utils import add_months, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    to_date = getdate(filters.to_date or nowdate())
    from_date = getdate(filters.from_date or add_months(to_date.replace(day=1), -11))
    months = max(1, (to_date.year - from_date.year) * 12 + to_date.month - from_date.month + 1)
    params = {"from_date": from_date, "to_date": to_date}
    where = ["ru.status != 'Under Maintenance'"]
    if filters.property:
        where.append("ru.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where.append("p.company = %(company)s")
        params["company"] = filters.company
    data = frappe.db.sql(
        f"""
        select ru.property, ru.floor, ru.name as unit, ru.unit_type, ru.area_sqm, ru.current_tenant,
               coalesce(sum(sii.base_net_amount), 0) as revenue
        from "tabRentable Unit" ru
        join "tabProperty" p on p.name = ru.property
        left join "tabLease Unit" lu on lu.unit = ru.name
        left join "tabSales Invoice" si on si.lease = lu.parent and si.docstatus = 1 and si.posting_date between %(from_date)s and %(to_date)s
        left join "tabSales Invoice Item" sii on sii.parent = si.name
            and position(coalesce(nullif(ru.unit_name, ''), ru.unit_code) in sii.description) > 0
        where {" and ".join(where)}
        group by ru.property, ru.floor, ru.name, ru.unit_type, ru.area_sqm, ru.current_tenant
        order by ru.property, ru.name
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["revenue_per_sqm"] = flt(row.revenue) / flt(row.area_sqm) if flt(row.area_sqm) else 0
        row["monthly_per_sqm"] = row["revenue_per_sqm"] / months
    ranked = sorted(data, key=lambda row: -row["revenue_per_sqm"])[:10]
    chart = {
        "data": {"labels": [row.unit for row in ranked], "datasets": [{"name": _("Revenue per sqm"), "values": [flt(row["revenue_per_sqm"], 2) for row in ranked]}]},
        "type": "bar",
        "colors": ["#b8860b"],
    }
    total_area = sum(flt(row.area_sqm) for row in data)
    total_revenue = sum(flt(row.revenue) for row in data)
    summary = [
        {"label": _("Revenue"), "value": total_revenue, "indicator": "green", "datatype": "Currency"},
        {"label": _("Average per sqm / month"), "value": total_revenue / total_area / months if total_area else 0, "indicator": "blue", "datatype": "Currency"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    return [
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Floor"), "fieldname": "floor", "fieldtype": "Link", "options": "Property Floor", "width": 120},
        {"label": _("Unit"), "fieldname": "unit", "fieldtype": "Link", "options": "Rentable Unit", "width": 110},
        {"label": _("Type"), "fieldname": "unit_type", "fieldtype": "Data", "width": 120},
        {"label": _("Tenant"), "fieldname": "current_tenant", "fieldtype": "Link", "options": "Customer", "width": 170},
        {"label": _("Area (sqm)"), "fieldname": "area_sqm", "fieldtype": "Float", "width": 90, "precision": 2},
        {"label": _("Revenue"), "fieldname": "revenue", "fieldtype": "Currency", "width": 130},
        {"label": _("Revenue / sqm"), "fieldname": "revenue_per_sqm", "fieldtype": "Currency", "width": 130},
        {"label": _("Monthly / sqm"), "fieldname": "monthly_per_sqm", "fieldtype": "Currency", "width": 130},
    ]
