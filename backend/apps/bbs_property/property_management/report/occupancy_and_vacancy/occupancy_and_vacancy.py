import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    filters = frappe._dict(filters or {})
    group = {"Property": "ru.property", "Floor": "ru.property, ru.floor", "Unit Type": "ru.property, ru.unit_type"}.get(filters.group_by or "Floor", "ru.property, ru.floor")
    label_column = {"Property": "''", "Floor": "ru.floor", "Unit Type": "ru.unit_type"}.get(filters.group_by or "Floor", "ru.floor")
    where, params = [], {}
    if filters.property:
        where.append("ru.property = %(property)s")
        params["property"] = filters.property
    if filters.company:
        where.append("p.company = %(company)s")
        params["company"] = filters.company
    clause = ("where " + " and ".join(where)) if where else ""
    data = frappe.db.sql(
        f"""
        select ru.property, {label_column} as segment,
               count(*) as total_units,
               sum(case when ru.status = 'Occupied' then 1 else 0 end) as occupied,
               sum(case when ru.status = 'Vacant' then 1 else 0 end) as vacant,
               sum(case when ru.status = 'Reserved' then 1 else 0 end) as reserved,
               sum(case when ru.status = 'Under Maintenance' then 1 else 0 end) as maintenance,
               coalesce(sum(ru.area_sqm), 0) as total_area,
               coalesce(sum(case when ru.status = 'Occupied' then ru.area_sqm else 0 end), 0) as leased_area,
               coalesce(sum(ru.base_rent), 0) as potential_rent,
               coalesce(sum(case when ru.status = 'Occupied' then ru.base_rent else 0 end), 0) as occupied_market_rent
        from "tabRentable Unit" ru join "tabProperty" p on p.name = ru.property
        {clause}
        group by {group}
        order by ru.property, segment
        """,
        params,
        as_dict=True,
    )
    for row in data:
        row["occupancy_by_area"] = flt(row.leased_area * 100.0 / row.total_area, 1) if flt(row.total_area) else 0
        row["occupancy_by_units"] = flt(row.occupied * 100.0 / row.total_units, 1) if row.total_units else 0
        row["vacancy_loss"] = flt(row.potential_rent) - flt(row.occupied_market_rent)
    labels = [row.segment or row.property for row in data]
    chart = {
        "data": {
            "labels": labels,
            "datasets": [
                {"name": _("Occupied"), "values": [row.occupied for row in data]},
                {"name": _("Vacant"), "values": [row.vacant for row in data]},
            ],
        },
        "type": "bar",
        "stacked": 1,
        "colors": ["#16a34a", "#f59e0b"],
    }
    total_units = sum(row.total_units for row in data)
    occupied = sum(row.occupied for row in data)
    summary = [
        {"label": _("Units"), "value": total_units, "indicator": "blue", "datatype": "Int"},
        {"label": _("Occupied"), "value": occupied, "indicator": "green", "datatype": "Int"},
        {"label": _("Occupancy"), "value": flt(occupied * 100.0 / total_units, 1) if total_units else 0, "indicator": "orange", "datatype": "Percent"},
        {"label": _("Vacancy Loss / Month"), "value": sum(flt(row.vacancy_loss) for row in data), "indicator": "red", "datatype": "Currency"},
    ]
    return get_columns(filters), data, None, chart, summary


def get_columns(filters):
    segment = filters.group_by or "Floor"
    columns = [{"label": _("Property"), "fieldname": "property", "fieldtype": "Link", "options": "Property", "width": 150}]
    if segment != "Property":
        columns.append({"label": _(segment), "fieldname": "segment", "fieldtype": "Data", "width": 150})
    columns += [
        {"label": _("Units"), "fieldname": "total_units", "fieldtype": "Int", "width": 70},
        {"label": _("Occupied"), "fieldname": "occupied", "fieldtype": "Int", "width": 85},
        {"label": _("Vacant"), "fieldname": "vacant", "fieldtype": "Int", "width": 75},
        {"label": _("Reserved"), "fieldname": "reserved", "fieldtype": "Int", "width": 85},
        {"label": _("Maintenance"), "fieldname": "maintenance", "fieldtype": "Int", "width": 100},
        {"label": _("Total Area"), "fieldname": "total_area", "fieldtype": "Float", "width": 100, "precision": 2},
        {"label": _("Leased Area"), "fieldname": "leased_area", "fieldtype": "Float", "width": 100, "precision": 2},
        {"label": _("Occupancy by Area"), "fieldname": "occupancy_by_area", "fieldtype": "Percent", "width": 130},
        {"label": _("Occupancy by Units"), "fieldname": "occupancy_by_units", "fieldtype": "Percent", "width": 130},
        {"label": _("Potential Rent"), "fieldname": "potential_rent", "fieldtype": "Currency", "width": 120},
        {"label": _("Vacancy Loss"), "fieldname": "vacancy_loss", "fieldtype": "Currency", "width": 120},
    ]
    return columns
