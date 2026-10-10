import frappe
from frappe import _
from frappe.utils import add_months, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    to_date = getdate(filters.to_date or nowdate())
    from_date = getdate(filters.from_date or add_months(to_date.replace(day=1), -11))
    params = {"from_date": from_date, "to_date": to_date}
    where_billed = ["si.docstatus = 1", "si.is_lease_invoice = 1", "si.posting_date between %(from_date)s and %(to_date)s"]
    where_paid = ["pe.docstatus = 1", "pe.payment_type = 'Receive'", "pe.posting_date between %(from_date)s and %(to_date)s", "si.is_lease_invoice = 1"]
    if filters.property:
        where_billed.append("si.property = %(property)s")
        where_paid.append("si.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where_billed.append("si.company = %(company)s")
        where_paid.append("si.company = %(company)s")
        params["company"] = filters.company
    billed = {
        (row.month, row.property): flt(row.total)
        for row in frappe.db.sql(
            f"""
            select to_char(date_trunc('month', si.posting_date), 'YYYY-MM') as month, si.property, sum(si.grand_total) as total
            from "tabSales Invoice" si where {" and ".join(where_billed)} group by 1, 2
            """,
            params,
            as_dict=True,
        )
    }
    collected = {
        (row.month, row.property): flt(row.total)
        for row in frappe.db.sql(
            f"""
            select to_char(date_trunc('month', pe.posting_date), 'YYYY-MM') as month, si.property, sum(per.allocated_amount) as total
            from "tabPayment Entry Reference" per
            join "tabPayment Entry" pe on pe.name = per.parent
            join "tabSales Invoice" si on si.name = per.reference_name and per.reference_doctype = 'Sales Invoice'
            where {" and ".join(where_paid)} group by 1, 2
            """,
            params,
            as_dict=True,
        )
    }
    keys = sorted(set(billed) | set(collected))
    data = []
    for month, property_name in keys:
        total_billed = billed.get((month, property_name), 0.0)
        total_collected = collected.get((month, property_name), 0.0)
        data.append(
            {
                "month": month,
                "property": property_name,
                "billed": total_billed,
                "collected": total_collected,
                "collection_rate": flt(total_collected * 100.0 / total_billed, 1) if total_billed else 0,
                "shortfall": total_billed - total_collected,
            }
        )
    months = sorted({row["month"] for row in data})
    chart = {
        "data": {
            "labels": months,
            "datasets": [
                {"name": _("Billed"), "values": [sum(r["billed"] for r in data if r["month"] == m) for m in months]},
                {"name": _("Collected"), "values": [sum(r["collected"] for r in data if r["month"] == m) for m in months]},
            ],
        },
        "type": "bar",
        "colors": ["#cbd5e1", "#16a34a"],
    }
    total_billed = sum(row["billed"] for row in data)
    total_collected = sum(row["collected"] for row in data)
    summary = [
        {"label": _("Billed"), "value": total_billed, "indicator": "blue", "datatype": "Currency"},
        {"label": _("Collected"), "value": total_collected, "indicator": "green", "datatype": "Currency"},
        {"label": _("Collection Rate"), "value": flt(total_collected * 100.0 / total_billed, 1) if total_billed else 0, "indicator": "orange", "datatype": "Percent"},
        {"label": _("Outstanding"), "value": total_billed - total_collected, "indicator": "red", "datatype": "Currency"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    return [
        {"label": _("Month"), "fieldname": "month", "fieldtype": "Data", "width": 100},
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 160},
        {"label": _("Billed"), "fieldname": "billed", "fieldtype": "Currency", "width": 130},
        {"label": _("Collected"), "fieldname": "collected", "fieldtype": "Currency", "width": 130},
        {"label": _("Collection Rate"), "fieldname": "collection_rate", "fieldtype": "Percent", "width": 120},
        {"label": _("Shortfall"), "fieldname": "shortfall", "fieldtype": "Currency", "width": 130},
    ]
