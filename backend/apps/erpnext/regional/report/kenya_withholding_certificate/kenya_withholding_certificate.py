import frappe
from frappe import _
from frappe.utils import flt


def execute(filters=None):
    filters = frappe._dict(filters or {})
    validate_filters(filters)
    return get_columns(), get_data(filters)


def validate_filters(filters):
    if not filters.company:
        frappe.throw(_("Company is mandatory"))
    if not (filters.from_date and filters.to_date):
        frappe.throw(_("From Date and To Date are mandatory"))
    if filters.from_date > filters.to_date:
        frappe.throw(_("From Date cannot be after To Date"))


def get_columns():
    return [
        {"label": _("Certificate No"), "fieldname": "certificate_no", "fieldtype": "Data", "width": 170},
        {"label": _("Supplier"), "fieldname": "party", "fieldtype": "Link", "options": "Supplier", "width": 160},
        {"label": _("Supplier Name"), "fieldname": "party_name", "fieldtype": "Data", "width": 180},
        {"label": _("KRA PIN"), "fieldname": "kra_pin", "fieldtype": "Data", "width": 120},
        {
            "label": _("Withholding Category"),
            "fieldname": "tax_withholding_category",
            "fieldtype": "Link",
            "options": "Tax Withholding Category",
            "width": 240,
        },
        {"label": _("Payment Date"), "fieldname": "withholding_date", "fieldtype": "Date", "width": 110},
        {"label": _("Document"), "fieldname": "withholding_name", "fieldtype": "Data", "width": 160},
        {"label": _("Gross Amount"), "fieldname": "taxable_amount", "fieldtype": "Currency", "width": 130},
        {"label": _("Rate"), "fieldname": "tax_rate", "fieldtype": "Percent", "width": 80},
        {"label": _("Tax Withheld"), "fieldname": "withholding_amount", "fieldtype": "Currency", "width": 130},
    ]


def certificate_number(company_abbr, party, from_date, to_date):
    return f"WHT-{company_abbr}-{party}-{from_date}-{to_date}".replace(" ", "")


def get_entries(filters):
    entry = frappe.qb.DocType("Tax Withholding Entry")
    query = (
        frappe.qb.from_(entry)
        .select(
            entry.party,
            entry.tax_withholding_category,
            entry.withholding_date,
            entry.withholding_name,
            entry.taxable_amount,
            entry.tax_rate,
            entry.withholding_amount,
        )
        .where(entry.company == filters.company)
        .where(entry.party_type == "Supplier")
        .where(entry.withholding_date >= filters.from_date)
        .where(entry.withholding_date <= filters.to_date)
        .orderby(entry.party)
        .orderby(entry.withholding_date)
    )
    if filters.supplier:
        query = query.where(entry.party == filters.supplier)
    if filters.tax_withholding_category:
        query = query.where(entry.tax_withholding_category == filters.tax_withholding_category)
    return query.run(as_dict=True)


def get_data(filters):
    entries = get_entries(filters)
    if not entries:
        return []

    abbr = frappe.get_cached_value("Company", filters.company, "abbr")
    suppliers = {
        row.name: row
        for row in frappe.get_all(
            "Supplier",
            filters={"name": ("in", list({entry.party for entry in entries}))},
            fields=["name", "supplier_name", "kra_pin"],
        )
    }

    rows = []
    totals = {}
    for entry in entries:
        supplier = suppliers.get(entry.party) or frappe._dict()
        rows.append(
            {
                "certificate_no": certificate_number(abbr, entry.party, filters.from_date, filters.to_date),
                "party": entry.party,
                "party_name": supplier.get("supplier_name"),
                "kra_pin": supplier.get("kra_pin"),
                "tax_withholding_category": entry.tax_withholding_category,
                "withholding_date": entry.withholding_date,
                "withholding_name": entry.withholding_name,
                "taxable_amount": flt(entry.taxable_amount),
                "tax_rate": flt(entry.tax_rate),
                "withholding_amount": flt(entry.withholding_amount),
            }
        )
        total = totals.setdefault(entry.party, [0.0, 0.0])
        total[0] += flt(entry.taxable_amount)
        total[1] += flt(entry.withholding_amount)

    grand = [sum(total[0] for total in totals.values()), sum(total[1] for total in totals.values())]
    rows.append(
        {
            "party_name": _("Total"),
            "taxable_amount": grand[0],
            "withholding_amount": grand[1],
        }
    )
    return rows
