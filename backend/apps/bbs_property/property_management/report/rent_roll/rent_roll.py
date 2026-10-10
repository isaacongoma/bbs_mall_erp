import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    as_on = getdate(filters.as_on or nowdate())
    params = {"as_on": as_on}
    where = []
    if filters.property:
        where.append("ru.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where.append("p.company = %(company)s")
        params["company"] = filters.company
    if filters.status:
        where.append("ru.status = %(status)s")
        params["status"] = filters.status
    if filters.floor:
        where.append("ru.floor = %(floor)s")
        params["floor"] = filters.floor
    clause = ("where " + " and ".join(where)) if where else ""
    data = frappe.db.sql(
        f"""
        select ru.property, ru.floor, ru.name as unit, ru.unit_name, ru.unit_type, ru.status, ru.area_sqm,
               ru.base_rent as market_rent,
               l.name as lease, l.customer, l.tenant_name, l.start_date, l.end_date,
               lu.monthly_rent, lu.monthly_service_charge,
               l.deposit_balance, l.outstanding_amount, l.overdue_amount
        from "tabRentable Unit" ru
        join "tabProperty" p on p.name = ru.property
        left join "tabLease Unit" lu on lu.unit = ru.name and lu.parent in (
            select name from "tabLease Agreement"
            where docstatus = 1 and status in ('Active', 'Expiring Soon', 'Expired', 'Terminated')
              and start_date <= %(as_on)s and coalesce(termination_date, end_date) >= %(as_on)s
        )
        left join "tabLease Agreement" l on l.name = lu.parent
        {clause}
        order by ru.property, ru.floor, ru.name
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["rate_per_sqm"] = flt(row.monthly_rent) / flt(row.area_sqm) if flt(row.area_sqm) and row.monthly_rent else 0
        row["status"] = row.status if not row.lease else _("Occupied")
    occupied = [row for row in data if row.lease]
    total_rent = sum(flt(row.monthly_rent) for row in occupied)
    summary = [
        {"label": _("Units"), "value": len(data), "indicator": "blue", "datatype": "Int"},
        {"label": _("Occupied"), "value": len(occupied), "indicator": "green", "datatype": "Int"},
        {"label": _("Occupancy"), "value": flt(len(occupied) * 100.0 / len(data), 1) if data else 0, "indicator": "orange", "datatype": "Percent"},
        {"label": _("Monthly Rent Roll"), "value": total_rent, "indicator": "green", "datatype": "Currency"},
    ]
    return get_columns(), data, None, None, summary


def get_columns():
    return [
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Floor"), "fieldname": "floor", "fieldtype": "Link", "options": "Property Floor", "width": 120},
        {"label": _("Unit"), "fieldname": "unit", "fieldtype": "Link", "options": "Rentable Unit", "width": 110},
        {"label": _("Type"), "fieldname": "unit_type", "fieldtype": "Data", "width": 120},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 110},
        {"label": _("Area (sqm)"), "fieldname": "area_sqm", "fieldtype": "Float", "width": 90, "precision": 2},
        {"label": _("Tenant"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 160},
        {"label": _("Lease"), "fieldname": "lease", "fieldtype": "Link", "options": "Lease Agreement", "width": 140},
        {"label": _("Start"), "fieldname": "start_date", "fieldtype": "Date", "width": 95},
        {"label": _("End"), "fieldname": "end_date", "fieldtype": "Date", "width": 95},
        {"label": _("Monthly Rent"), "fieldname": "monthly_rent", "fieldtype": "Currency", "width": 120},
        {"label": _("Service Charge"), "fieldname": "monthly_service_charge", "fieldtype": "Currency", "width": 120},
        {"label": _("Rent / sqm"), "fieldname": "rate_per_sqm", "fieldtype": "Currency", "width": 100},
        {"label": _("Market Rent"), "fieldname": "market_rent", "fieldtype": "Currency", "width": 110},
        {"label": _("Deposit Held"), "fieldname": "deposit_balance", "fieldtype": "Currency", "width": 110},
        {"label": _("Outstanding"), "fieldname": "outstanding_amount", "fieldtype": "Currency", "width": 110},
        {"label": _("Overdue"), "fieldname": "overdue_amount", "fieldtype": "Currency", "width": 110},
    ]
