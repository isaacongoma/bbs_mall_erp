import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class Property(Document):
    doctype = "Property"

    def validate(self):
        self.abbr = (self.abbr or "").strip().upper()
        if not self.abbr:
            frappe.throw(_("Abbreviation is required."))

    def onload(self):
        self.set_onload("metrics", property_metrics(self.name))

    @frappe.whitelist()
    def refresh_metrics(self):
        self.check_permission("write")
        return refresh_property_metrics(self.name)


def property_metrics(property_name):
    row = frappe.db.sql(
        """
        select count(*) as total,
               coalesce(sum(case when status = 'Occupied' then 1 else 0 end), 0) as occupied,
               coalesce(sum(case when status = 'Vacant' then 1 else 0 end), 0) as vacant,
               coalesce(sum(case when status = 'Occupied' then area_sqm else 0 end), 0) as leased_area,
               coalesce(sum(area_sqm), 0) as total_area
        from "tabRentable Unit" where property = %s
        """,
        (property_name,),
        as_dict=True,
    )[0]
    total = row.total or 0
    return {
        "total_units": total,
        "occupied_units": row.occupied,
        "vacant_units": row.vacant,
        "leased_area": flt(row.leased_area, 2),
        "total_area": flt(row.total_area, 2),
        "occupancy_rate": flt(row.occupied * 100.0 / total, 2) if total else 0,
    }


def refresh_property_metrics(property_name):
    if not property_name or not frappe.db.exists("Property", property_name):
        return {}
    metrics = property_metrics(property_name)
    frappe.db.set_value(
        "Property",
        property_name,
        {
            "total_units": metrics["total_units"],
            "occupied_units": metrics["occupied_units"],
            "vacant_units": metrics["vacant_units"],
            "leased_area": metrics["leased_area"],
            "occupancy_rate": metrics["occupancy_rate"],
        },
        update_modified=False,
    )
    return metrics
