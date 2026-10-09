import frappe
from frappe import _
from frappe.utils import flt

from erpnext.regional.kenya.data import VAT_RATES

TREATMENTS = (
    ("Kenya VAT 16%", "Standard Rated 16%"),
    ("Kenya VAT 8% Fuel", "Fuel 8%"),
    ("Kenya VAT 0% Zero Rated", "Zero Rated"),
    ("Kenya VAT Exempt", "Exempt"),
)
UNCLASSIFIED = "Unclassified"


def execute(filters=None):
    filters = frappe._dict(filters or {})
    validate_filters(filters)
    return get_columns(), get_data(filters), None, None, get_summary(filters)


def validate_filters(filters):
    if not filters.company:
        frappe.throw(_("Company is mandatory"))
    if not (filters.from_date and filters.to_date):
        frappe.throw(_("From Date and To Date are mandatory"))
    if filters.from_date > filters.to_date:
        frappe.throw(_("From Date cannot be after To Date"))


def get_columns():
    return [
        {"label": _("Section"), "fieldname": "section", "fieldtype": "Data", "width": 110},
        {"label": _("VAT Treatment"), "fieldname": "treatment", "fieldtype": "Data", "width": 200},
        {"label": _("Rate"), "fieldname": "rate", "fieldtype": "Percent", "width": 80},
        {"label": _("Invoices"), "fieldname": "invoices", "fieldtype": "Int", "width": 90},
        {"label": _("Net Amount"), "fieldname": "net_amount", "fieldtype": "Currency", "width": 140},
        {"label": _("VAT"), "fieldname": "vat_amount", "fieldtype": "Currency", "width": 140},
        {"label": _("Gross Amount"), "fieldname": "gross_amount", "fieldtype": "Currency", "width": 140},
    ]


def treatment_for(template):
    for name, label in TREATMENTS:
        if template == name or (template or "").startswith(f"{name} - "):
            return label
    return UNCLASSIFIED


def rate_for(label):
    for name, treatment in TREATMENTS:
        if treatment == label:
            return dict(VAT_RATES).get(name, 0.0)
    return 0.0


def get_invoices(doctype, filters):
    invoice = frappe.qb.DocType(doctype)
    query = (
        frappe.qb.from_(invoice)
        .select(
            invoice.name,
            invoice.taxes_and_charges,
            invoice.base_net_total,
            invoice.base_total_taxes_and_charges,
            invoice.base_grand_total,
        )
        .where(invoice.docstatus == 1)
        .where(invoice.company == filters.company)
        .where(invoice.posting_date >= filters.from_date)
        .where(invoice.posting_date <= filters.to_date)
    )
    return query.run(as_dict=True)


def summarise(doctype, section, filters):
    buckets = {label: [0, 0.0, 0.0, 0.0] for _name, label in TREATMENTS}
    buckets[UNCLASSIFIED] = [0, 0.0, 0.0, 0.0]
    for row in get_invoices(doctype, filters):
        bucket = buckets[treatment_for(row.taxes_and_charges)]
        bucket[0] += 1
        bucket[1] += flt(row.base_net_total)
        bucket[2] += flt(row.base_total_taxes_and_charges)
        bucket[3] += flt(row.base_grand_total)

    rows = []
    for label, (count, net, vat, gross) in buckets.items():
        if label == UNCLASSIFIED and not count:
            continue
        rows.append(
            {
                "section": section,
                "treatment": label,
                "rate": rate_for(label),
                "invoices": count,
                "net_amount": net,
                "vat_amount": vat,
                "gross_amount": gross,
            }
        )
    return rows


def total_row(section, rows):
    return {
        "section": section,
        "treatment": _("Total {0}").format(section),
        "invoices": sum(row["invoices"] for row in rows),
        "net_amount": sum(row["net_amount"] for row in rows),
        "vat_amount": sum(row["vat_amount"] for row in rows),
        "gross_amount": sum(row["gross_amount"] for row in rows),
    }


def get_data(filters):
    output = summarise("Sales Invoice", _("Output"), filters)
    input_rows = summarise("Purchase Invoice", _("Input"), filters)
    output_total = total_row(_("Output"), output)
    input_total = total_row(_("Input"), input_rows)
    net_payable = {
        "section": _("Net"),
        "treatment": _("VAT Payable (Output - Input)"),
        "invoices": 0,
        "net_amount": output_total["net_amount"] - input_total["net_amount"],
        "vat_amount": output_total["vat_amount"] - input_total["vat_amount"],
        "gross_amount": output_total["gross_amount"] - input_total["gross_amount"],
    }
    return [*output, output_total, *input_rows, input_total, net_payable]


def get_summary(filters):
    data = get_data(filters)
    output_vat = next(row["vat_amount"] for row in data if row["treatment"] == _("Total {0}").format(_("Output")))
    input_vat = next(row["vat_amount"] for row in data if row["treatment"] == _("Total {0}").format(_("Input")))
    payable = output_vat - input_vat
    return [
        {"value": output_vat, "label": _("Output VAT"), "datatype": "Currency"},
        {"value": input_vat, "label": _("Input VAT"), "datatype": "Currency"},
        {
            "value": payable,
            "label": _("VAT Payable") if payable >= 0 else _("VAT Refundable"),
            "datatype": "Currency",
            "indicator": "Red" if payable > 0 else "Green",
        },
    ]
