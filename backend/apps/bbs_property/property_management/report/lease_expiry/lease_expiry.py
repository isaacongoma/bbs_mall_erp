import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    within = cint(filters.within_days) or 180
    today = getdate(nowdate())
    params = {"today": today, "horizon": add_days(today, within)}
    where = [
        "l.docstatus = 1",
        "l.status in ('Active', 'Expiring Soon')",
        "coalesce(l.termination_date, l.end_date) between %(today)s and %(horizon)s",
    ]
    if filters.property:
        where.append("l.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where.append("l.company = %(company)s")
        params["company"] = filters.company
    data = frappe.db.sql(
        f"""
        select l.name as lease, l.customer, l.tenant_name, l.property, l.start_date,
               coalesce(l.termination_date, l.end_date) as end_date,
               (select string_agg(u.unit, ', ') from "tabLease Unit" u where u.parent = l.name) as units,
               l.total_area, l.total_monthly_rent, l.auto_renew, l.status, l.outstanding_amount,
               exists(select 1 from "tabLease Agreement" r where r.renewal_of = l.name and r.docstatus < 2) as renewal_started
        from "tabLease Agreement" l
        where {" and ".join(where)}
        order by coalesce(l.termination_date, l.end_date)
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["days_left"] = (getdate(row.end_date) - today).days
        row["renewal"] = _("Started") if row.renewal_started else (_("Auto") if row.auto_renew else "")
    buckets = {"0-30": 0, "31-60": 0, "61-90": 0, "91+": 0}
    for row in data:
        key = "0-30" if row.days_left <= 30 else "31-60" if row.days_left <= 60 else "61-90" if row.days_left <= 90 else "91+"
        buckets[key] += 1
    chart = {"data": {"labels": list(buckets), "datasets": [{"name": _("Leases"), "values": list(buckets.values())}]}, "type": "bar", "colors": ["#dc2626"]}
    summary = [
        {"label": _("Expiring"), "value": len(data), "indicator": "orange", "datatype": "Int"},
        {"label": _("Rent at Risk / Month"), "value": sum(flt(row.total_monthly_rent) for row in data), "indicator": "red", "datatype": "Currency"},
        {"label": _("Outstanding Balance"), "value": sum(flt(row.outstanding_amount) for row in data), "indicator": "red", "datatype": "Currency"},
        {"label": _("Area Expiring (sqm)"), "value": sum(flt(row.total_area) for row in data), "indicator": "blue", "datatype": "Float"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    return [
        {"label": _("Lease"), "fieldname": "lease", "fieldtype": "Link", "options": "Lease Agreement", "width": 140},
        {"label": _("Tenant"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 170},
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Units"), "fieldname": "units", "fieldtype": "Data", "width": 140},
        {"label": _("Area (sqm)"), "fieldname": "total_area", "fieldtype": "Float", "width": 90, "precision": 2},
        {"label": _("Start"), "fieldname": "start_date", "fieldtype": "Date", "width": 95},
        {"label": _("Ends"), "fieldname": "end_date", "fieldtype": "Date", "width": 95},
        {"label": _("Days Left"), "fieldname": "days_left", "fieldtype": "Int", "width": 90},
        {"label": _("Monthly Rent"), "fieldname": "total_monthly_rent", "fieldtype": "Currency", "width": 120},
        {"label": _("Outstanding"), "fieldname": "outstanding_amount", "fieldtype": "Currency", "width": 120},
        {"label": _("Renewal"), "fieldname": "renewal", "fieldtype": "Data", "width": 90},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
    ]
