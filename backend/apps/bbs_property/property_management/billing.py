import math
from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import add_days, add_months, cint, date_diff, flt, getdate, nowdate

from apps.bbs_property.property_management.utils import (
    ACTIVE_LEASE_STATUSES,
    get_settings,
    months_for,
    today,
)


def whole_months(start, end):
    start, end = getdate(start), getdate(end)
    months = (end.year - start.year) * 12 + end.month - start.month
    return months - 1 if end.day < start.day else months


def escalation_factor(lease, on_date):
    if lease.escalation_type in (None, "", "None") or not cint(lease.escalation_months):
        return 1.0, 0.0
    steps = max(0, whole_months(lease.rent_start_date or lease.start_date, on_date) // cint(lease.escalation_months))
    if lease.escalation_type == "Percentage":
        return (1 + flt(lease.escalation_rate) / 100) ** steps, 0.0
    return 1.0, flt(lease.escalation_amount) * steps


def build_rent_schedule(lease):
    start = getdate(lease.start_date)
    end = getdate(lease.end_date)
    rent_start = getdate(lease.rent_start_date or lease.start_date)
    base_rent = sum(flt(row.monthly_rent) for row in lease.units)
    service = sum(flt(row.monthly_service_charge) for row in lease.units)
    rows = []
    if rent_start > start:
        rows.append(
            {
                "from_date": start,
                "to_date": min(add_days(rent_start, -1), end),
                "monthly_rent": 0,
                "monthly_service_charge": service,
                "note": _("Rent-free period"),
            }
        )
    step_months = cint(lease.escalation_months) if lease.escalation_type not in (None, "", "None") else 0
    cursor = rent_start
    index = 0
    while cursor <= end:
        if step_months:
            segment_end = min(add_days(add_months(rent_start, step_months * (index + 1)), -1), end)
        else:
            segment_end = end
        if lease.escalation_type == "Percentage":
            rent = base_rent * (1 + flt(lease.escalation_rate) / 100) ** index
        elif lease.escalation_type == "Fixed Amount":
            rent = base_rent + flt(lease.escalation_amount) * index
        else:
            rent = base_rent
        note = _("Base rent") if index == 0 else _("Escalation {0}").format(index)
        rows.append(
            {
                "from_date": cursor,
                "to_date": segment_end,
                "monthly_rent": flt(rent, 2),
                "monthly_service_charge": service,
                "note": note,
            }
        )
        cursor = add_days(segment_end, 1)
        index += 1
    lease.set("rent_schedule", [])
    for row in rows:
        lease.append("rent_schedule", row)


def monthly_rent_on(lease, on_date):
    on_date = getdate(on_date)
    for row in lease.rent_schedule:
        if getdate(row.from_date) <= on_date <= getdate(row.to_date):
            return flt(row.monthly_rent), flt(row.monthly_service_charge)
    return 0.0, 0.0


def rent_between(lease, start, end):
    total = 0.0
    start, end = getdate(start), getdate(end)
    for row in lease.rent_schedule:
        lo = max(getdate(row.from_date), start)
        hi = min(getdate(row.to_date), end)
        if lo > hi:
            continue
        days = date_diff(hi, lo) + 1
        total += flt(row.monthly_rent) * days / 30.4375
    return flt(total, 2)


def period_amounts(lease, start, end):
    months = months_for(lease.billing_frequency)
    start, end = getdate(start), getdate(end)
    full_days = date_diff(add_days(add_months(start, months), -1), start) + 1
    rent_total = sum(flt(unit.monthly_rent) for unit in lease.units) or 1.0
    service_total = sum(flt(unit.monthly_service_charge) for unit in lease.units) or 1.0
    lines = []
    for unit in lease.units:
        rent = service = 0.0
        for row in lease.rent_schedule:
            lo = max(getdate(row.from_date), start)
            hi = min(getdate(row.to_date), end)
            if lo > hi:
                continue
            share = (date_diff(hi, lo) + 1) / full_days
            rent += flt(row.monthly_rent) * (flt(unit.monthly_rent) / rent_total) * months * share
            service += flt(row.monthly_service_charge) * (flt(unit.monthly_service_charge) / service_total) * months * share
        lines.append({"unit": unit.unit, "rent": flt(rent, 2), "service": flt(service, 2)})
    return lines


def charge_lines(lease, start, end):
    months = months_for(lease.billing_frequency)
    lines = []
    factor, bump = escalation_factor(lease, start)
    for charge in lease.charges:
        if charge.frequency == "One-off":
            if cint(charge.one_off_billed):
                continue
            lines.append({"charge": charge, "amount": flt(charge.amount, 2), "one_off": True})
            continue
        charge_months = months_for(charge.frequency)
        if not charge_months:
            continue
        if charge_months <= months:
            amount = flt(charge.amount) * (months / charge_months)
        else:
            offset = (getdate(start).year - getdate(lease.start_date).year) * 12 + getdate(start).month - getdate(lease.start_date).month
            if offset % charge_months:
                continue
            amount = flt(charge.amount)
        if cint(charge.escalates):
            amount = amount * factor + bump
        lines.append({"charge": charge, "amount": flt(amount, 2), "one_off": False})
    return lines


def first_unbilled_start(lease):
    if lease.last_billed_to:
        return add_days(getdate(lease.last_billed_to), 1)
    return getdate(lease.rent_start_date or lease.start_date)


def next_period(lease):
    start = first_unbilled_start(lease)
    if start > getdate(lease.end_date) or lease.status in ("Terminated", "Expired", "Cancelled"):
        return None
    end = min(add_days(add_months(start, months_for(lease.billing_frequency)), -1), getdate(lease.end_date))
    if lease.termination_date:
        end = min(end, getdate(lease.termination_date))
        if start > end:
            return None
    return start, end


def invoice_exists(lease_name, start):
    return frappe.db.exists(
        "Sales Invoice",
        {"lease": lease_name, "billing_period_start": start, "docstatus": ["<", 2], "late_fee_for": ["is", "not set"]},
    )


def is_due(lease, run_date, settings=None):
    period = next_period(lease)
    if not period:
        return False
    settings = settings or get_settings()
    lead = cint(settings.billing_lead_days)
    return getdate(period[0]) - timedelta(days=lead) <= getdate(run_date)


def due_leases(company=None, property=None, run_date=None, automatic_only=False):
    run_date = getdate(run_date or nowdate())
    filters = {"docstatus": 1, "status": ["in", list(ACTIVE_LEASE_STATUSES)]}
    if company:
        filters["company"] = company
    if property:
        filters["property"] = property
    if automatic_only:
        filters["auto_invoice"] = 1
    settings = get_settings()
    leases = []
    for name in frappe.get_all("Lease Agreement", filters=filters, pluck="name", order_by="name asc"):
        lease = frappe.get_doc("Lease Agreement", name)
        if is_due(lease, run_date, settings):
            leases.append(lease)
    return leases


def collect_extras(lease, start, end, include_utilities=True, include_turnover=True):
    extras = []
    if include_utilities:
        unit_names = [row.unit for row in lease.units]
        if unit_names:
            readings = frappe.get_all(
                "Meter Reading",
                filters={"unit": ["in", unit_names], "status": "Approved", "sales_invoice": ["is", "not set"]},
                fields=["name", "meter", "utility_type", "consumption", "amount", "tariff", "reading_date", "unit"],
                order_by="reading_date asc",
            )
            for reading in readings:
                if flt(reading.amount) <= 0:
                    continue
                item = frappe.db.get_value("Utility Tariff", reading.tariff, "item")
                uom = frappe.db.get_value("Utility Tariff", reading.tariff, "uom")
                extras.append(
                    {
                        "kind": "reading",
                        "ref": reading.name,
                        "item": item,
                        "description": _("{0} {1} - {2} {3} ({4})").format(
                            reading.utility_type, reading.meter, flt(reading.consumption, 2), uom or "", reading.reading_date
                        ),
                        "amount": flt(reading.amount, 2),
                    }
                )
    if include_turnover and cint(lease.turnover_rent_applicable):
        for row in frappe.get_all(
            "Tenant Sales Declaration",
            filters={"lease": lease.name, "status": "Approved", "sales_invoice": ["is", "not set"]},
            fields=["name", "period_start", "period_end", "turnover_rent_due"],
        ):
            if flt(row.turnover_rent_due) > 0:
                extras.append(
                    {
                        "kind": "turnover",
                        "ref": row.name,
                        "item": get_settings().turnover_rent_item,
                        "description": _("Turnover rent {0} to {1}").format(row.period_start, row.period_end),
                        "amount": flt(row.turnover_rent_due, 2),
                    }
                )
    return extras


def prepare_invoice(invoice):
    currency = frappe.get_cached_value("Company", invoice.company, "default_currency")
    price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list") or frappe.db.get_value(
        "Price List", {"selling": 1, "enabled": 1}
    )
    if not price_list:
        price_list = (
            frappe.get_doc(
                {"doctype": "Price List", "price_list_name": "Standard Selling", "selling": 1, "enabled": 1, "currency": currency}
            )
            .insert(ignore_permissions=True)
            .name
        )
    invoice.currency = currency
    invoice.conversion_rate = 1
    invoice.selling_price_list = price_list
    invoice.price_list_currency = currency
    invoice.plc_conversion_rate = 1
    invoice.ignore_pricing_rule = 1
    return invoice


def rent_item_for(settings):
    item = settings.rent_item
    if not item:
        frappe.throw(_("Set the Rent Item in Property Settings before generating invoices."))
    return item


def service_item_for(settings):
    return settings.service_charge_item or settings.rent_item


def make_lease_invoice(lease, start, end, posting_date=None, include_utilities=True, include_turnover=True, submit=True):
    settings = get_settings()
    if invoice_exists(lease.name, start):
        return None
    property_doc = frappe.get_cached_doc("Property", lease.property)
    posting_date = getdate(posting_date or nowdate())
    invoice = frappe.new_doc("Sales Invoice")
    invoice.customer = lease.customer
    invoice.company = lease.company
    invoice.set_posting_time = 1
    invoice.posting_date = posting_date
    invoice.due_date = max(posting_date, add_days(getdate(start), cint(lease.payment_terms_days)))
    invoice.cost_center = lease.cost_center or property_doc.cost_center
    invoice.lease = lease.name
    invoice.property = lease.property
    invoice.billing_period_start = start
    invoice.billing_period_end = end
    invoice.is_lease_invoice = 1
    invoice.remarks = _("Rent for {0}, {1} to {2}").format(lease.name, start, end)
    prepare_invoice(invoice)

    def add_row(item, description, amount, unit=None):
        if flt(amount) <= 0:
            return
        row = {
            "item_code": item,
            "description": description,
            "qty": 1,
            "rate": flt(amount, 2),
            "cost_center": invoice.cost_center,
        }
        invoice.append("items", row)

    rent_item = rent_item_for(settings)
    service_item = service_item_for(settings)
    for line in period_amounts(lease, start, end):
        label = frappe.db.get_value("Rentable Unit", line["unit"], "unit_name") or line["unit"]
        if line["rent"]:
            add_row(rent_item, _("Rent - {0} ({1} to {2})").format(label, start, end), line["rent"])
        if line["service"]:
            add_row(service_item, _("Service charge - {0} ({1} to {2})").format(label, start, end), line["service"])
    for entry in charge_lines(lease, start, end):
        charge = entry["charge"]
        add_row(charge.charge_item, charge.description or charge.charge_item, entry["amount"])
    extras = collect_extras(lease, start, end, include_utilities, include_turnover)
    for extra in extras:
        add_row(extra["item"] or rent_item, extra["description"], extra["amount"])
    if not invoice.items:
        return None
    if property_doc.rent_income_account:
        for row in invoice.items:
            row.income_account = property_doc.rent_income_account
    template = lease.tax_template or settings.tax_template
    if template:
        invoice.taxes_and_charges = template
        invoice.set_taxes()
    invoice.insert(ignore_permissions=True)
    if submit:
        invoice.submit()
    mark_billed(lease, start, end, charge_lines(lease, start, end), extras, invoice.name)
    return invoice


def mark_billed(lease, start, end, charges, extras, invoice_name):
    for entry in charges:
        if entry["one_off"]:
            frappe.db.set_value("Lease Charge", entry["charge"].name, "one_off_billed", 1, update_modified=False)
    for extra in extras:
        if extra["kind"] == "reading":
            frappe.db.set_value("Meter Reading", extra["ref"], {"status": "Billed", "sales_invoice": invoice_name})
        else:
            frappe.db.set_value("Tenant Sales Declaration", extra["ref"], {"status": "Billed", "sales_invoice": invoice_name})
    lease.db_set("last_billed_to", end, update_modified=False)
    following = add_days(getdate(end), 1)
    lease.db_set("next_billing_date", following if following <= getdate(lease.end_date) else None, update_modified=False)
    refresh_lease_totals(lease.name)


def refresh_lease_totals(lease_name):
    if not lease_name or not frappe.db.exists("Lease Agreement", lease_name):
        return
    row = frappe.db.sql(
        """
        select coalesce(sum(grand_total), 0) as billed,
               coalesce(sum(outstanding_amount), 0) as outstanding,
               coalesce(sum(case when due_date < current_date then outstanding_amount else 0 end), 0) as overdue
        from "tabSales Invoice"
        where lease = %s and docstatus = 1
        """,
        (lease_name,),
        as_dict=True,
    )[0]
    deposit = deposit_figures(lease_name)
    frappe.db.set_value(
        "Lease Agreement",
        lease_name,
        {
            "total_billed": flt(row.billed),
            "outstanding_amount": flt(row.outstanding),
            "total_paid": flt(row.billed) - flt(row.outstanding),
            "overdue_amount": flt(row.overdue),
            "deposit_received": deposit["received"],
            "deposit_balance": deposit["balance"],
        },
        update_modified=False,
    )


def deposit_figures(lease_name):
    row = frappe.db.sql(
        """
        select coalesce(sum(case when transaction_type = 'Receipt' then amount else 0 end), 0) as received,
               coalesce(sum(case when transaction_type = 'Receipt' then amount else -amount end), 0) as balance
        from "tabLease Deposit" where lease = %s and docstatus = 1
        """,
        (lease_name,),
        as_dict=True,
    )[0]
    return {"received": flt(row.received), "balance": flt(row.balance)}


def refresh_lease_for_invoice(doc, method=None):
    if doc.get("lease"):
        refresh_lease_totals(doc.lease)


def refresh_leases_for_payment(doc, method=None):
    leases = set()
    for reference in doc.get("references") or []:
        if reference.reference_doctype == "Sales Invoice":
            lease = frappe.db.get_value("Sales Invoice", reference.reference_name, "lease")
            if lease:
                leases.add(lease)
    for lease in leases:
        refresh_lease_totals(lease)


def late_fee_due(invoice, settings, as_of=None):
    as_of = getdate(as_of or nowdate())
    due = getdate(invoice.due_date)
    grace = cint(settings.grace_period_days)
    overdue_days = date_diff(as_of, add_days(due, grace))
    if overdue_days <= 0:
        return 0, 0
    period = math.ceil(overdue_days / 30)
    outstanding = flt(invoice.outstanding_amount)
    amount = max(flt(settings.late_fee_flat_amount), outstanding * flt(settings.late_fee_percent) / 100)
    cap = flt(invoice.grand_total) * flt(settings.maximum_late_fee_percent) / 100 if flt(settings.maximum_late_fee_percent) else None
    return period, (flt(amount, 2) if cap is None else min(flt(amount, 2), flt(cap, 2)))


def apply_late_fees(as_of=None):
    settings = get_settings()
    if not cint(settings.enable_late_fees) or not settings.late_fee_item:
        return 0
    created = 0
    overdue = frappe.get_all(
        "Sales Invoice",
        filters={
            "docstatus": 1,
            "is_lease_invoice": 1,
            "outstanding_amount": [">", 0],
            "late_fee_for": ["is", "not set"],
            "due_date": ["<", getdate(as_of or nowdate())],
        },
        pluck="name",
    )
    for name in overdue:
        invoice = frappe.get_doc("Sales Invoice", name)
        period, amount = late_fee_due(invoice, settings, as_of)
        if not period or amount <= 0:
            continue
        paid_fees = flt(
            frappe.db.sql(
                'select coalesce(sum(grand_total), 0) from "tabSales Invoice" where late_fee_for = %s and docstatus = 1',
                (name,),
            )[0][0]
        )
        cap = flt(invoice.grand_total) * flt(settings.maximum_late_fee_percent) / 100 if flt(settings.maximum_late_fee_percent) else None
        if cap is not None and paid_fees >= cap:
            continue
        if frappe.db.exists("Sales Invoice", {"late_fee_for": name, "late_fee_period": period, "docstatus": ["<", 2]}):
            continue
        fee = frappe.new_doc("Sales Invoice")
        fee.customer = invoice.customer
        fee.company = invoice.company
        fee.set_posting_time = 1
        fee.posting_date = getdate(as_of or nowdate())
        fee.due_date = add_days(fee.posting_date, cint(frappe.db.get_value("Lease Agreement", invoice.lease, "payment_terms_days") or 7))
        fee.lease = invoice.lease
        fee.property = invoice.property
        fee.is_lease_invoice = 1
        fee.late_fee_for = name
        fee.late_fee_period = period
        fee.cost_center = invoice.cost_center
        fee.remarks = _("Late payment fee on {0}, month {1}").format(name, period)
        prepare_invoice(fee)
        fee.append(
            "items",
            {
                "item_code": settings.late_fee_item,
                "description": _("Late payment fee on invoice {0} (overdue month {1})").format(name, period),
                "qty": 1,
                "rate": amount,
                "cost_center": invoice.cost_center,
            },
        )
        if invoice.taxes_and_charges:
            fee.taxes_and_charges = invoice.taxes_and_charges
            fee.set_taxes()
        fee.insert(ignore_permissions=True)
        fee.submit()
        created += 1
    return created


def rewind_lease(lease_name, period_start):
    lease = frappe.get_doc("Lease Agreement", lease_name)
    previous = add_days(getdate(period_start), -1)
    first = getdate(lease.rent_start_date or lease.start_date)
    frappe.db.set_value(
        "Lease Agreement",
        lease_name,
        {"last_billed_to": previous if previous >= first else None, "next_billing_date": getdate(period_start)},
        update_modified=False,
    )
    refresh_lease_totals(lease_name)
