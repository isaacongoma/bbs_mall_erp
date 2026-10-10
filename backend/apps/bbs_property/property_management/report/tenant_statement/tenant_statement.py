import frappe
from frappe import _
from frappe.utils import add_months, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    if not filters.customer:
        frappe.throw(_("Select a tenant."))
    to_date = getdate(filters.to_date or nowdate())
    from_date = getdate(filters.from_date or add_months(to_date, -6))
    opening = flt(
        frappe.db.sql(
            """
            select coalesce(sum(debit - credit), 0) from "tabGL Entry"
            where party_type = 'Customer' and party = %s and is_cancelled = 0 and posting_date < %s
            """,
            (filters.customer, from_date),
        )[0][0]
    )
    rows = frappe.db.sql(
        """
        select posting_date, voucher_type, voucher_no, debit, credit, remarks, against_voucher
        from "tabGL Entry"
        where party_type = 'Customer' and party = %s and is_cancelled = 0 and posting_date between %s and %s
        order by posting_date, creation
        """,
        (filters.customer, from_date, to_date),
        as_dict=True,
    )
    data = [{"posting_date": None, "voucher_type": _("Opening Balance"), "balance": opening}]
    balance = opening
    for row in rows:
        balance += flt(row.debit) - flt(row.credit)
        data.append({**row, "balance": balance})
    data.append({"voucher_type": _("Closing Balance"), "balance": balance, "debit": sum(flt(r.debit) for r in rows), "credit": sum(flt(r.credit) for r in rows)})
    summary = [
        {"label": _("Opening"), "value": opening, "datatype": "Currency", "indicator": "blue"},
        {"label": _("Billed"), "value": sum(flt(r.debit) for r in rows), "datatype": "Currency", "indicator": "orange"},
        {"label": _("Paid"), "value": sum(flt(r.credit) for r in rows), "datatype": "Currency", "indicator": "green"},
        {"label": _("Closing"), "value": balance, "datatype": "Currency", "indicator": "red" if balance > 0 else "green"},
    ]
    return get_columns(), data, None, None, summary


def get_columns():
    return [
        {"label": _("Date"), "fieldname": "posting_date", "fieldtype": "Date", "width": 100},
        {"label": _("Type"), "fieldname": "voucher_type", "fieldtype": "Data", "width": 140},
        {"label": _("Voucher"), "fieldname": "voucher_no", "fieldtype": "Dynamic Link", "options": "voucher_type", "width": 170},
        {"label": _("Details"), "fieldname": "remarks", "fieldtype": "Data", "width": 280},
        {"label": _("Charges"), "fieldname": "debit", "fieldtype": "Currency", "width": 130},
        {"label": _("Payments"), "fieldname": "credit", "fieldtype": "Currency", "width": 130},
        {"label": _("Balance"), "fieldname": "balance", "fieldtype": "Currency", "width": 140},
    ]
