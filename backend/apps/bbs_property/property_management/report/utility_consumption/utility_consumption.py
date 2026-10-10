import frappe
from frappe import _
from frappe.utils import add_months, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    to_date = getdate(filters.to_date or nowdate())
    from_date = getdate(filters.from_date or add_months(to_date.replace(day=1), -5))
    params = {"from_date": from_date, "to_date": to_date}
    where = ["r.reading_date between %(from_date)s and %(to_date)s", "r.status in ('Approved', 'Billed')"]
    if filters.property:
        where.append("r.property = %(property)s")
        params["property"] = filters.property
    if filters.utility_type:
        where.append("r.utility_type = %(utility_type)s")
        params["utility_type"] = filters.utility_type
    data = frappe.db.sql(
        f"""
        select r.meter, r.utility_type, r.unit, r.property, m.tariff,
               min(r.previous_reading) as opening, max(r.current_reading) as closing,
               sum(r.consumption) as consumption, sum(r.amount) as amount,
               sum(case when r.status = 'Billed' then r.amount else 0 end) as billed,
               count(*) as readings, max(r.reading_date) as last_reading
        from "tabMeter Reading" r join "tabUtility Meter" m on m.name = r.meter
        where {" and ".join(where)}
        group by r.meter, r.utility_type, r.unit, r.property, m.tariff
        order by r.property, r.unit
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["unbilled"] = flt(row.amount) - flt(row.billed)
        row["uom"] = frappe.db.get_value("Utility Tariff", row.tariff, "uom")
    by_type = {}
    for row in data:
        by_type[row.utility_type] = by_type.get(row.utility_type, 0) + flt(row.consumption)
    chart = {"data": {"labels": list(by_type), "datasets": [{"name": _("Consumption"), "values": list(by_type.values())}]}, "type": "bar", "colors": ["#2563eb"]} if by_type else None
    summary = [
        {"label": _("Charges"), "value": sum(flt(row.amount) for row in data), "indicator": "blue", "datatype": "Currency"},
        {"label": _("Unbilled"), "value": sum(flt(row.unbilled) for row in data), "indicator": "orange", "datatype": "Currency"},
        {"label": _("Billed"), "value": sum(flt(row.amount) for row in data) - sum(flt(row.unbilled) for row in data), "indicator": "green", "datatype": "Currency"},
        {"label": _("Charge Lines"), "value": len(data), "indicator": "orange", "datatype": "Int"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    return [
        {"label": _("Meter"), "fieldname": "meter", "fieldtype": "Link", "options": "Utility Meter", "width": 130},
        {"label": _("Utility"), "fieldname": "utility_type", "fieldtype": "Data", "width": 100},
        {"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 140},
        {"label": _("Unit"), "fieldname": "unit", "fieldtype": "Link", "options": "Rentable Unit", "width": 110},
        {"label": _("Opening"), "fieldname": "opening", "fieldtype": "Float", "width": 100},
        {"label": _("Closing"), "fieldname": "closing", "fieldtype": "Float", "width": 100},
        {"label": _("Consumption"), "fieldname": "consumption", "fieldtype": "Float", "width": 110},
        {"label": _("UOM"), "fieldname": "uom", "fieldtype": "Data", "width": 70},
        {"label": _("Readings"), "fieldname": "readings", "fieldtype": "Int", "width": 80},
        {"label": _("Charges"), "fieldname": "amount", "fieldtype": "Currency", "width": 120},
        {"label": _("Billed"), "fieldname": "billed", "fieldtype": "Currency", "width": 120},
        {"label": _("Unbilled"), "fieldname": "unbilled", "fieldtype": "Currency", "width": 120},
        {"label": _("Last Reading"), "fieldname": "last_reading", "fieldtype": "Date", "width": 110},
    ]
