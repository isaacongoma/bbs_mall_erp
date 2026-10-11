import frappe
from frappe import _

COLUMNS = [{'label': 'Date', 'fieldname': 'posting_date', 'fieldtype': 'Date', 'width': 100},
 {'label': 'Transaction', 'fieldname': 'transaction', 'fieldtype': 'Link', 'options': 'Seller Wallet Transaction', 'width': 150},
 {'label': 'Type', 'fieldname': 'transaction_type', 'fieldtype': 'Data', 'width': 150},
 {'label': 'Status', 'fieldname': 'status', 'fieldtype': 'Data', 'width': 90},
 {'label': 'Amount', 'fieldname': 'amount', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'Balance', 'fieldname': 'balance_after', 'fieldtype': 'Currency', 'width': 120},
 {'label': 'Available On', 'fieldname': 'available_on', 'fieldtype': 'Date', 'width': 110},
 {'label': 'Reference Type', 'fieldname': 'reference_doctype', 'fieldtype': 'Data', 'width': 140},
 {'label': 'Reference', 'fieldname': 'reference_name', 'fieldtype': 'Dynamic Link', 'options': 'reference_doctype', 'width': 160},
 {'label': 'Remarks', 'fieldname': 'remarks', 'fieldtype': 'Data', 'width': 220}]
CONDITIONS = [('seller', 't.seller = %(seller)s'),
 ('transaction_type', 't.transaction_type = %(transaction_type)s'),
 ('status', 't.status = %(status)s'),
 ('from_date', 't.posting_date::date >= %(from_date)s'),
 ('to_date', 't.posting_date::date <= %(to_date)s')]
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
        select t.posting_date::date as posting_date, t.name as transaction, t.transaction_type, t.status, t.amount, t.balance_after, t.available_on, t.reference_doctype, t.reference_name, t.remarks
        from "tabSeller Wallet Transaction" t
        {clause}
        
        order by t.posting_date desc, t.creation desc
        """,
        params,
        as_dict=True,
    )
    columns = [dict(column, label=_(column["label"])) for column in COLUMNS]
    return columns, data
