import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    filters = frappe._dict(filters or {})
    params = {}
    where = ["l.docstatus = 1"]
    if filters.property:
        where.append("l.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where.append("l.company = %(company)s")
        params["company"] = filters.company
    if filters.customer:
        where.append("l.customer = %(customer)s")
        params["customer"] = filters.customer
    data = frappe.db.sql(
        f"""
        select l.name as lease, l.customer, l.property, l.status, l.security_deposit_amount as required,
               coalesce(sum(case when d.transaction_type = 'Receipt' then d.amount end), 0) as received,
               coalesce(sum(case when d.transaction_type = 'Refund' then d.amount end), 0) as refunded,
               coalesce(sum(case when d.transaction_type = 'Deduction' then d.amount end), 0) as deducted
        from "tabLease Agreement" l
        left join "tabLease Deposit" d on d.lease = l.name and d.docstatus = 1
        where {" and ".join(where)}
        group by l.name, l.customer, l.property, l.status, l.security_deposit_amount
        having l.security_deposit_amount > 0 or coalesce(sum(d.amount), 0) > 0
        order by l.name
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["balance"] = flt(row.received) - flt(row.refunded) - flt(row.deducted)
        row["shortfall"] = max(0.0, flt(row.required) - flt(row.received))
    if filters.only_with_balance:
        data = [row for row in data if flt(row["balance"]) > 0]
    summary = [
        {"label": _("Deposits Held"), "value": sum(flt(row["balance"]) for row in data), "indicator": "green", "datatype": "Currency"},
        {"label": _("Shortfall"), "value": sum(flt(row["shortfall"]) for row in data), "indicator": "red", "datatype": "Currency"},
    ]
    return get_columns(), data, None, None, summary


def get_columns():
    return [
        {"label": _("Lease"), "fieldname": "lease", "fieldtype": "Link", "options": "Lease Agreement", "width": 140},
        {"label": _("Tenant"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 170},
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Status"), "fieldname": "status", "fieldtype": "Data", "width": 100},
        {"label": _("Required"), "fieldname": "required", "fieldtype": "Currency", "width": 120},
        {"label": _("Received"), "fieldname": "received", "fieldtype": "Currency", "width": 120},
        {"label": _("Refunded"), "fieldname": "refunded", "fieldtype": "Currency", "width": 120},
        {"label": _("Deducted"), "fieldname": "deducted", "fieldtype": "Currency", "width": 120},
        {"label": _("Held"), "fieldname": "balance", "fieldtype": "Currency", "width": 120},
        {"label": _("Shortfall"), "fieldname": "shortfall", "fieldtype": "Currency", "width": 120},
    ]
