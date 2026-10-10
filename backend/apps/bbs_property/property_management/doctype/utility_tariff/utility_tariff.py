import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class UtilityTariff(Document):
    doctype = "Utility Tariff"

    def validate(self):
        rows = sorted(self.slabs, key=lambda row: flt(row.from_unit))
        previous_end = 0.0
        for row in rows:
            if flt(row.from_unit) < previous_end:
                frappe.throw(_("Tariff slabs overlap at {0}.").format(row.from_unit))
            previous_end = flt(row.to_unit) if row.to_unit else float("inf")
        if not rows and not flt(self.rate_per_unit):
            frappe.throw(_("Enter a flat rate or at least one slab."))


def compute_charge(tariff, consumption):
    consumption = flt(consumption)
    total = flt(tariff.fixed_charge)
    slabs = sorted(tariff.slabs, key=lambda row: flt(row.from_unit))
    if slabs:
        for row in slabs:
            lower = flt(row.from_unit)
            upper = flt(row.to_unit) if row.to_unit else consumption
            if consumption <= lower:
                continue
            total += (min(consumption, upper) - lower) * flt(row.rate)
    else:
        total += consumption * flt(tariff.rate_per_unit)
    total += total * flt(tariff.markup_percent) / 100
    return flt(total, 2)
