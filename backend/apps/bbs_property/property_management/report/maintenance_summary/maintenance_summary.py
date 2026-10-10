import frappe
from frappe import _
from frappe.utils import add_months, flt, getdate, nowdate


def execute(filters=None):
    filters = frappe._dict(filters or {})
    to_date = getdate(filters.to_date or nowdate())
    from_date = getdate(filters.from_date or add_months(to_date, -3))
    params = {"from_date": from_date, "to_date": to_date}
    where = ["m.opened_on::date between %(from_date)s and %(to_date)s"]
    if filters.property:
        where.append("m.property = %(property)s")
        params["property"] = filters.property
    if filters.category:
        where.append("m.category = %(category)s")
        params["category"] = filters.category
    data = frappe.db.sql(
        f"""
        select coalesce(m.category, 'Other') as category, m.priority,
               count(*) as total,
               sum(case when m.status in ('Resolved', 'Closed') then 1 else 0 end) as resolved,
               sum(case when m.status not in ('Resolved', 'Closed', 'Cancelled') then 1 else 0 end) as open_requests,
               sum(case when (m.resolved_on is not null and m.resolved_on > m.due_by)
                          or (m.resolved_on is null and m.status not in ('Closed', 'Cancelled') and now() > m.due_by) then 1 else 0 end) as sla_breached,
               coalesce(avg(extract(epoch from (m.resolved_on - m.opened_on)) / 3600) filter (where m.resolved_on is not null), 0) as avg_hours,
               coalesce(sum(m.actual_cost), 0) as cost,
               coalesce(avg(m.rating) filter (where m.rating is not null), 0) * 5 as rating
        from "tabMaintenance Request" m
        where {" and ".join(where)}
        group by coalesce(m.category, 'Other'), m.priority
        order by 1, m.priority
        """,
        params,
        as_dict=True,
    )
    by_category = {}
    for row in data:
        by_category[row.category] = by_category.get(row.category, 0) + row.total
    chart = {"data": {"labels": list(by_category), "datasets": [{"name": _("Requests"), "values": list(by_category.values())}]}, "type": "donut"} if by_category else None
    total = sum(row.total for row in data)
    resolved = sum(row.resolved for row in data)
    summary = [
        {"label": _("Requests"), "value": total, "indicator": "blue", "datatype": "Int"},
        {"label": _("Resolved"), "value": resolved, "indicator": "green", "datatype": "Int"},
        {"label": _("SLA Breaches"), "value": sum(row.sla_breached for row in data), "indicator": "red", "datatype": "Int"},
        {"label": _("Cost"), "value": sum(flt(row.cost) for row in data), "indicator": "orange", "datatype": "Currency"},
    ]
    return get_columns(), data, None, chart, summary


def get_columns():
    return [
        {"label": _("Category"), "fieldname": "category", "fieldtype": "Data", "width": 170},
        {"label": _("Priority"), "fieldname": "priority", "fieldtype": "Data", "width": 90},
        {"label": _("Requests"), "fieldname": "total", "fieldtype": "Int", "width": 90},
        {"label": _("Resolved"), "fieldname": "resolved", "fieldtype": "Int", "width": 90},
        {"label": _("Open"), "fieldname": "open_requests", "fieldtype": "Int", "width": 80},
        {"label": _("SLA Breached"), "fieldname": "sla_breached", "fieldtype": "Int", "width": 110},
        {"label": _("Avg Resolution (hrs)"), "fieldname": "avg_hours", "fieldtype": "Float", "width": 140, "precision": 1},
        {"label": _("Cost"), "fieldname": "cost", "fieldtype": "Currency", "width": 120},
        {"label": _("Rating (of 5)"), "fieldname": "rating", "fieldtype": "Float", "width": 110, "precision": 1},
    ]
