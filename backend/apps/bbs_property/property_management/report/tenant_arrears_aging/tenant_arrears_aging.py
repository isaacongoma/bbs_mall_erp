import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate

BUCKETS = (("not_due", "Not Yet Due"), ("b30", "1-30"), ("b60", "31-60"), ("b90", "61-90"), ("b120", "91-120"), ("b120p", "120+"))


def execute(filters=None):
    filters = frappe._dict(filters or {})
    as_on = getdate(filters.as_on or nowdate())
    params = {"as_on": as_on}
    where = ["si.docstatus = 1", "si.outstanding_amount > 0", "si.is_lease_invoice = 1"]
    if filters.property:
        where.append("si.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where.append("si.company = %(company)s")
        params["company"] = filters.company
    if filters.customer:
        where.append("si.customer = %(customer)s")
        params["customer"] = filters.customer
    rows = frappe.db.sql(
        f"""
        select si.customer, si.customer_name, si.property, si.lease, si.name as invoice, si.due_date,
               si.outstanding_amount,
               (%(as_on)s::date - si.due_date) as days_overdue
        from "tabSales Invoice" si
        where {" and ".join(where)}
        order by si.customer_name, si.due_date
        """,
        params,
        as_dict=True,
    )
    grouped = {}
    for row in rows:
        key = (row.customer, row.property)
        item = grouped.setdefault(
            key,
            {"customer": row.customer, "customer_name": row.customer_name, "property": row.property, "lease": row.lease, "not_due": 0.0, "b30": 0.0, "b60": 0.0, "b90": 0.0, "b120": 0.0, "b120p": 0.0, "total": 0.0, "oldest_due": row.due_date, "invoices": 0},
        )
        days = row.days_overdue
        bucket = "not_due" if days <= 0 else "b30" if days <= 30 else "b60" if days <= 60 else "b90" if days <= 90 else "b120" if days <= 120 else "b120p"
        item[bucket] += flt(row.outstanding_amount)
        item["total"] += flt(row.outstanding_amount)
        item["invoices"] += 1
        if row.due_date < item["oldest_due"]:
            item["oldest_due"] = row.due_date
    data = sorted(grouped.values(), key=lambda row: -row["total"])
    totals = {key: sum(row[key] for row in data) for key, _label in BUCKETS}
    chart = {
        "data": {"labels": [_(label) for _key, label in BUCKETS], "datasets": [{"name": _("Outstanding"), "values": [totals[key] for key, _label in BUCKETS]}]},
        "type": "bar",
        "colors": ["#ca8a04"],
    }
    summary = [
        {"label": _("Total Outstanding"), "value": sum(totals.values()), "indicator": "red", "datatype": "Currency"},
        {"label": _("Overdue"), "value": sum(v for k, v in totals.items() if k != "not_due"), "indicator": "orange", "datatype": "Currency"},
        {"label": _("Tenants in Arrears"), "value": len([row for row in data if row["total"] - row["not_due"] > 0]), "indicator": "blue", "datatype": "Int"},
        {"label": _("Not Yet Due"), "value": totals.get("not_due", 0), "indicator": "green", "datatype": "Currency"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    columns = [
        {"label": _("Tenant"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 180},
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Lease"), "fieldname": "lease", "fieldtype": "Link", "options": "Lease Agreement", "width": 140},
        {"label": _("Invoices"), "fieldname": "invoices", "fieldtype": "Int", "width": 80},
        {"label": _("Oldest Due"), "fieldname": "oldest_due", "fieldtype": "Date", "width": 100},
    ]
    for key, label in BUCKETS:
        columns.append({"label": _(label), "fieldname": key, "fieldtype": "Currency", "width": 115})
    columns.append({"label": _("Total"), "fieldname": "total", "fieldtype": "Currency", "width": 125})
    return columns
