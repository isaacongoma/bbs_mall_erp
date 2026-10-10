import base64
import re

import frappe
from frappe import _
from frappe.utils import add_days, add_months, cint, flt, getdate, now_datetime, nowdate

from apps.bbs_property.property_management import billing, mpesa
from apps.bbs_property.property_management.utils import ACTIVE_LEASE_STATUSES, get_settings, send_sms

STAFF_ROLES = {"System Manager", "Property Manager", "Leasing Officer", "Property Accountant"}
ACCESS = {
    "Owner": {"finance", "operations", "manage"},
    "Finance": {"finance"},
    "Operations": {"operations"},
}
TENANT_ROLE = "Tenant"
UPLOAD_TARGETS = {"Maintenance Request", "Meter Reading", "Tenant Sales Declaration"}
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def is_staff():
    return bool(STAFF_ROLES & set(frappe.get_roles()))


def memberships(user=None):
    user = user or frappe.session.user
    return frappe.db.sql(
        """
        select p.parent as customer, p.access_level, c.customer_name
        from "tabTenant Portal User" p
        join "tabCustomer" c on c.name = p.parent
        where p.user = %s and p.parenttype = 'Customer' and coalesce(c.disabled, 0) = 0
        order by c.customer_name
        """,
        (user,),
        as_dict=True,
    )


def tenant(customer=None, need=None):
    if not cint(get_settings().enable_tenant_portal):
        frappe.throw(_("The tenant portal is currently switched off."), frappe.PermissionError)
    rows = memberships()
    if not rows and is_staff() and customer:
        if not frappe.db.exists("Customer", customer):
            frappe.throw(_("Unknown tenant."), frappe.DoesNotExistError)
        return {"customer": customer, "access_level": "Owner", "customer_name": frappe.db.get_value("Customer", customer, "customer_name")}
    if not rows:
        frappe.throw(_("Your account is not linked to a tenant."), frappe.PermissionError)
    chosen = next((row for row in rows if row.customer == customer), None) if customer else rows[0]
    if not chosen:
        if is_staff() and customer and frappe.db.exists("Customer", customer):
            return {"customer": customer, "access_level": "Owner", "customer_name": frappe.db.get_value("Customer", customer, "customer_name")}
        frappe.throw(_("You do not have access to this tenant."), frappe.PermissionError)
    if need and need not in ACCESS.get(chosen.access_level, set()):
        frappe.throw(_("Your access level does not allow this."), frappe.PermissionError)
    return chosen


def money(value):
    return flt(value, 2)


def tenant_units(customer):
    return frappe.db.sql(
        """
        select u.unit, ru.unit_name, ru.property, ru.unit_type, ru.area_sqm, ru.floor, l.name as lease,
               u.monthly_rent, u.monthly_service_charge
        from "tabLease Unit" u
        join "tabLease Agreement" l on l.name = u.parent
        join "tabRentable Unit" ru on ru.name = u.unit
        where l.customer = %s and l.docstatus = 1 and l.status in ('Active', 'Expiring Soon')
        """,
        (customer,),
        as_dict=True,
    )


@frappe.whitelist()
def get_context():
    settings = get_settings()
    rows = memberships()
    staff = is_staff()
    user = frappe.db.get_value("User", frappe.session.user, ["full_name", "email", "mobile_no", "user_image"], as_dict=True)
    return {
        "enabled": bool(cint(settings.enable_tenant_portal)),
        "user": user,
        "is_staff": staff,
        "tenants": [dict(row) for row in rows],
        "settings": {
            "welcome": settings.portal_welcome_message,
            "support_phone": settings.support_phone,
            "support_email": settings.support_email,
            "paybill": settings.mpesa_paybill,
            "till": settings.mpesa_till,
            "mpesa": mpesa.configured(settings),
            "meter_readings": bool(cint(settings.allow_tenant_meter_readings)),
            "sales_declarations": bool(cint(settings.allow_tenant_sales_declarations)),
        },
    }


@frappe.whitelist()
def get_dashboard(customer=None):
    ctx = tenant(customer)
    customer = ctx["customer"]
    levels = ACCESS.get(ctx["access_level"], set())
    data = {"customer": customer, "customer_name": ctx["customer_name"], "access_level": ctx["access_level"]}
    totals = frappe.db.sql(
        """
        select coalesce(sum(outstanding_amount), 0) as outstanding,
               coalesce(sum(case when due_date < current_date then outstanding_amount else 0 end), 0) as overdue,
               coalesce(sum(grand_total), 0) as billed
        from "tabSales Invoice" where customer = %s and docstatus = 1
        """,
        (customer,),
        as_dict=True,
    )[0]
    data["balance"] = {key: money(value) for key, value in totals.items()}
    if "finance" in levels:
        data["next_due"] = frappe.db.sql(
            """
            select name, due_date, outstanding_amount, grand_total, billing_period_start, billing_period_end
            from "tabSales Invoice"
            where customer = %s and docstatus = 1 and outstanding_amount > 0
            order by due_date asc limit 1
            """,
            (customer,),
            as_dict=True,
        )
        data["recent_invoices"] = recent_invoices(customer, 5)
        data["recent_payments"] = recent_payments(customer, 5)
        data["monthly"] = monthly_series(customer)
    leases = frappe.get_all(
        "Lease Agreement",
        filters={"customer": customer, "docstatus": 1, "status": ["in", list(ACTIVE_LEASE_STATUSES)]},
        fields=["name", "property", "start_date", "end_date", "status", "billing_frequency", "next_billing_date", "total_monthly_rent", "total_monthly_service_charge", "deposit_balance", "turnover_rent_applicable"],
    )
    for lease in leases:
        lease["units"] = frappe.get_all("Lease Unit", filters={"parent": lease.name}, fields=["unit", "area_sqm", "monthly_rent"])
        lease["days_left"] = (getdate(lease.end_date) - getdate(nowdate())).days
    data["leases"] = leases
    data["units"] = tenant_units(customer)
    if "operations" in levels:
        data["open_requests"] = frappe.db.count("Maintenance Request", {"customer": customer, "status": ["not in", ["Resolved", "Closed", "Cancelled"]]})
        data["recent_requests"] = frappe.get_all(
            "Maintenance Request",
            filters={"customer": customer},
            fields=["name", "subject", "status", "priority", "category", "opened_on", "unit"],
            order_by="creation desc",
            limit=4,
        )
        data["pending_readings"] = pending_meters(customer)
    data["notices"] = notices_for(customer, 3)
    return data


def recent_invoices(customer, limit=5):
    return frappe.get_all(
        "Sales Invoice",
        filters={"customer": customer, "docstatus": 1},
        fields=["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "billing_period_start", "billing_period_end", "status", "late_fee_for"],
        order_by="posting_date desc, creation desc",
        limit=limit,
    )


def recent_payments(customer, limit=5):
    return frappe.get_all(
        "Payment Entry",
        filters={"party_type": "Customer", "party": customer, "docstatus": 1, "payment_type": "Receive"},
        fields=["name", "posting_date", "paid_amount", "mode_of_payment", "reference_no"],
        order_by="posting_date desc, creation desc",
        limit=limit,
    )


def monthly_series(customer):
    start = add_months(getdate(nowdate()).replace(day=1), -11)
    billed = {
        row.month: money(row.total)
        for row in frappe.db.sql(
            """
            select to_char(date_trunc('month', posting_date), 'YYYY-MM') as month, sum(grand_total) as total
            from "tabSales Invoice" where customer = %s and docstatus = 1 and posting_date >= %s group by 1
            """,
            (customer, start),
            as_dict=True,
        )
    }
    paid = {
        row.month: money(row.total)
        for row in frappe.db.sql(
            """
            select to_char(date_trunc('month', posting_date), 'YYYY-MM') as month, sum(paid_amount) as total
            from "tabPayment Entry" where party_type = 'Customer' and party = %s and docstatus = 1
              and payment_type = 'Receive' and posting_date >= %s group by 1
            """,
            (customer, start),
            as_dict=True,
        )
    }
    series = []
    for index in range(12):
        key = add_months(start, index).strftime("%Y-%m")
        series.append({"month": key, "billed": billed.get(key, 0), "paid": paid.get(key, 0)})
    return series


@frappe.whitelist()
def get_invoices(customer=None, status=None, start=0, limit=20):
    ctx = tenant(customer, "finance")
    filters = {"customer": ctx["customer"], "docstatus": 1}
    if status == "unpaid":
        filters["outstanding_amount"] = [">", 0]
    elif status == "paid":
        filters["outstanding_amount"] = ["<=", 0]
    rows = frappe.get_all(
        "Sales Invoice",
        filters=filters,
        fields=["name", "posting_date", "due_date", "grand_total", "outstanding_amount", "billing_period_start", "billing_period_end", "status", "late_fee_for", "lease"],
        order_by="posting_date desc, creation desc",
        start=cint(start),
        page_length=cint(limit),
    )
    total = frappe.db.count("Sales Invoice", filters)
    return {"rows": rows, "total": total}


@frappe.whitelist()
def get_invoice(name, customer=None):
    ctx = tenant(customer, "finance")
    invoice = frappe.get_doc("Sales Invoice", name)
    if invoice.customer != ctx["customer"] or invoice.docstatus != 1:
        frappe.throw(_("Invoice not found."), frappe.DoesNotExistError)
    company = frappe.db.get_value("Company", invoice.company, ["company_name", "tax_id", "email", "phone_no", "website"], as_dict=True)
    property_name = invoice.get("property")
    return {
        "name": invoice.name,
        "posting_date": invoice.posting_date,
        "due_date": invoice.due_date,
        "currency": invoice.currency,
        "grand_total": invoice.grand_total,
        "net_total": invoice.net_total,
        "total_taxes_and_charges": invoice.total_taxes_and_charges,
        "outstanding_amount": invoice.outstanding_amount,
        "status": invoice.status,
        "lease": invoice.get("lease"),
        "property": property_name,
        "period_start": invoice.get("billing_period_start"),
        "period_end": invoice.get("billing_period_end"),
        "customer": invoice.customer,
        "customer_name": invoice.customer_name,
        "tax_id": invoice.tax_id,
        "company": company,
        "items": [{"description": row.description, "qty": row.qty, "rate": row.rate, "amount": row.amount} for row in invoice.items],
        "taxes": [{"description": row.description, "rate": row.rate, "amount": row.tax_amount} for row in invoice.taxes],
        "etims": {
            "qr": invoice.get("custom_etims_qr") or invoice.get("etims_qr_code"),
            "receipt": invoice.get("custom_etims_receipt_no") or invoice.get("etims_receipt_number"),
        },
    }


@frappe.whitelist()
def get_statement(customer=None, from_date=None, to_date=None):
    ctx = tenant(customer, "finance")
    customer = ctx["customer"]
    to_date = getdate(to_date or nowdate())
    from_date = getdate(from_date or add_months(to_date, -6))
    opening = frappe.db.sql(
        """
        select coalesce(sum(debit - credit), 0) from "tabGL Entry"
        where party_type = 'Customer' and party = %s and is_cancelled = 0 and posting_date < %s
        """,
        (customer, from_date),
    )[0][0]
    rows = frappe.db.sql(
        """
        select posting_date, voucher_type, voucher_no, debit, credit, remarks, against_voucher_type, against_voucher
        from "tabGL Entry"
        where party_type = 'Customer' and party = %s and is_cancelled = 0
          and posting_date between %s and %s
        order by posting_date asc, creation asc
        """,
        (customer, from_date, to_date),
        as_dict=True,
    )
    balance = flt(opening)
    lines = []
    for row in rows:
        balance += flt(row.debit) - flt(row.credit)
        lines.append({**row, "debit": money(row.debit), "credit": money(row.credit), "balance": money(balance)})
    return {"customer": customer, "customer_name": ctx["customer_name"], "from_date": from_date, "to_date": to_date, "opening": money(opening), "closing": money(balance), "rows": lines}


@frappe.whitelist()
def get_payments(customer=None):
    ctx = tenant(customer, "finance")
    customer = ctx["customer"]
    mpesa_rows = frappe.get_all(
        "Mpesa Payment",
        filters={"customer": customer},
        fields=["name", "transaction_id", "amount", "status", "source", "transaction_time", "creation", "sales_invoice", "result_description"],
        order_by="creation desc",
        limit=20,
    )
    return {"payments": recent_payments(customer, 50), "mpesa": mpesa_rows}


@frappe.whitelist()
def start_payment(customer=None, phone=None, amount=None, invoice=None):
    ctx = tenant(customer, "finance")
    customer = ctx["customer"]
    lease = None
    if invoice:
        row = frappe.db.get_value("Sales Invoice", invoice, ["customer", "outstanding_amount", "lease"], as_dict=True)
        if not row or row.customer != customer:
            frappe.throw(_("Invoice not found."), frappe.DoesNotExistError)
        lease = row.lease
        amount = amount or row.outstanding_amount
    if not amount:
        amount = frappe.db.sql('select coalesce(sum(outstanding_amount), 0) from "tabSales Invoice" where customer = %s and docstatus = 1', (customer,))[0][0]
    if flt(amount) <= 0:
        frappe.throw(_("There is nothing to pay."))
    return mpesa.stk_push(customer, phone, amount, invoice=invoice, lease=lease)


@frappe.whitelist()
def check_payment(payment, customer=None):
    ctx = tenant(customer, "finance")
    row = frappe.db.get_value("Mpesa Payment", payment, ["customer", "status", "transaction_id", "result_description", "amount", "payment_entry"], as_dict=True)
    if not row or row.customer != ctx["customer"]:
        frappe.throw(_("Payment not found."), frappe.DoesNotExistError)
    return row


@frappe.whitelist()
def get_leases(customer=None):
    ctx = tenant(customer)
    leases = frappe.get_all(
        "Lease Agreement",
        filters={"customer": ctx["customer"], "docstatus": 1},
        fields=["name", "property", "status", "start_date", "end_date", "billing_frequency", "total_monthly_rent", "total_monthly_service_charge", "deposit_balance", "security_deposit_amount", "outstanding_amount", "next_billing_date", "tenant_signed_on", "landlord_signed_on", "auto_renew", "escalation_type", "escalation_rate", "escalation_months", "turnover_rent_applicable", "turnover_rent_percent", "notice_period_days", "signed_copy"],
        order_by="end_date desc",
    )
    for lease in leases:
        lease["units"] = frappe.get_all("Lease Unit", filters={"parent": lease.name}, fields=["unit", "unit_type", "area_sqm", "monthly_rent", "monthly_service_charge"])
        lease["documents"] = frappe.get_all("Lease Document", filters={"parent": lease.name}, fields=["document_type", "file", "expiry_date"])
        lease["schedule"] = frappe.get_all("Lease Rent Schedule", filters={"parent": lease.name}, fields=["from_date", "to_date", "monthly_rent", "monthly_service_charge", "note"], order_by="from_date asc")
        lease["charges"] = frappe.get_all("Lease Charge", filters={"parent": lease.name}, fields=["charge_item", "description", "amount", "frequency"])
        lease["days_left"] = (getdate(lease.end_date) - getdate(nowdate())).days
    return leases


@frappe.whitelist()
def sign_lease(lease, signature, signatory_name=None, customer=None):
    ctx = tenant(customer, "manage")
    doc = frappe.get_doc("Lease Agreement", lease)
    if doc.customer != ctx["customer"] or doc.docstatus != 1:
        frappe.throw(_("Lease not found."), frappe.DoesNotExistError)
    if doc.tenant_signed_on:
        frappe.throw(_("This lease is already signed."))
    if not signature or not str(signature).startswith("data:image"):
        frappe.throw(_("Draw your signature first."))
    doc.sign("Tenant", signature, signatory_name or frappe.db.get_value("User", frappe.session.user, "full_name"))
    return True


@frappe.whitelist()
def request_renewal(lease, message=None, customer=None):
    ctx = tenant(customer, "manage")
    doc = frappe.get_doc("Lease Agreement", lease)
    if doc.customer != ctx["customer"]:
        frappe.throw(_("Lease not found."), frappe.DoesNotExistError)
    manager = frappe.db.get_value("Property", doc.property, "manager")
    doc.add_comment("Comment", _("Renewal requested from the tenant portal. {0}").format(message or ""))
    if manager:
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "for_user": manager,
                "type": "Alert",
                "subject": _("{0} asked to renew lease {1}").format(ctx["customer_name"], doc.name),
                "document_type": "Lease Agreement",
                "document_name": doc.name,
            }
        ).insert(ignore_permissions=True)
    return True


@frappe.whitelist()
def get_maintenance(customer=None, status=None):
    ctx = tenant(customer, "operations")
    filters = {"customer": ctx["customer"]}
    if status == "open":
        filters["status"] = ["not in", ["Resolved", "Closed", "Cancelled"]]
    elif status == "closed":
        filters["status"] = ["in", ["Resolved", "Closed", "Cancelled"]]
    rows = frappe.get_all(
        "Maintenance Request",
        filters=filters,
        fields=["name", "subject", "status", "priority", "category", "unit", "opened_on", "due_by", "resolved_on", "rating", "description"],
        order_by="creation desc",
        limit=100,
    )
    return rows


@frappe.whitelist()
def get_maintenance_request(name, customer=None):
    ctx = tenant(customer, "operations")
    doc = frappe.get_doc("Maintenance Request", name)
    if doc.customer != ctx["customer"]:
        frappe.throw(_("Request not found."), frappe.DoesNotExistError)
    return {
        "name": doc.name,
        "subject": doc.subject,
        "status": doc.status,
        "priority": doc.priority,
        "category": doc.category,
        "unit": doc.unit,
        "property": doc.property,
        "description": doc.description,
        "opened_on": doc.opened_on,
        "due_by": doc.due_by,
        "resolved_on": doc.resolved_on,
        "resolution": doc.resolution,
        "rating": doc.rating,
        "feedback": doc.feedback,
        "updates": [
            {"posted_on": row.posted_on, "posted_by": row.posted_by, "status": row.status, "note": row.note}
            for row in doc.updates
            if cint(row.visible_to_tenant)
        ],
        "attachments": frappe.get_all(
            "File",
            filters={"attached_to_doctype": "Maintenance Request", "attached_to_name": doc.name},
            fields=["name", "file_name", "file_url", "is_private"],
        ),
        "can_rate": doc.status in ("Resolved", "Closed") and not doc.rating,
    }


@frappe.whitelist()
def create_maintenance_request(subject, unit, category=None, priority="Medium", description=None, customer=None):
    ctx = tenant(customer, "operations")
    row = next((u for u in tenant_units(ctx["customer"]) if u.unit == unit), None)
    if not row:
        frappe.throw(_("That unit is not on one of your active leases."), frappe.PermissionError)
    doc = frappe.get_doc(
        {
            "doctype": "Maintenance Request",
            "subject": subject,
            "property": row.property,
            "unit": unit,
            "customer": ctx["customer"],
            "lease": row.lease,
            "category": category or "Other",
            "priority": priority if priority in ("Low", "Medium", "High", "Urgent") else "Medium",
            "description": description,
            "source": "Tenant Portal",
        }
    )
    doc.insert(ignore_permissions=True)
    return doc.name


@frappe.whitelist()
def add_maintenance_comment(name, note, customer=None):
    ctx = tenant(customer, "operations")
    doc = frappe.get_doc("Maintenance Request", name)
    if doc.customer != ctx["customer"]:
        frappe.throw(_("Request not found."), frappe.DoesNotExistError)
    doc.append("updates", {"posted_on": now_datetime(), "posted_by": frappe.db.get_value("User", frappe.session.user, "full_name"), "status": doc.status, "note": note, "visible_to_tenant": 1})
    if doc.status in ("Resolved", "Closed"):
        doc.status = "Open"
        doc.resolved_on = None
    doc.save(ignore_permissions=True)
    return True


@frappe.whitelist()
def rate_maintenance_request(name, rating, feedback=None, customer=None):
    ctx = tenant(customer, "operations")
    doc = frappe.get_doc("Maintenance Request", name)
    if doc.customer != ctx["customer"] or doc.status not in ("Resolved", "Closed"):
        frappe.throw(_("You can rate a request after it is resolved."))
    doc.rating = min(1.0, max(0.0, flt(rating) / 5.0))
    doc.feedback = feedback
    doc.save(ignore_permissions=True)
    return True


@frappe.whitelist()
def upload_attachment(doctype, docname, filename, content, customer=None):
    ctx = tenant(customer, "operations")
    if doctype not in UPLOAD_TARGETS:
        frappe.throw(_("Uploads are not allowed here."), frappe.PermissionError)
    owner = frappe.db.get_value(doctype, docname, "customer")
    if owner != ctx["customer"]:
        frappe.throw(_("Record not found."), frappe.DoesNotExistError)
    payload = content.split(",", 1)[-1]
    raw = base64.b64decode(payload)
    if len(raw) > MAX_UPLOAD_BYTES:
        frappe.throw(_("Files can be up to 8 MB."))
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", filename or "upload")[:100]
    if not safe.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".pdf", ".heic")):
        frappe.throw(_("Only photos and PDF files can be uploaded."))
    file = frappe.get_doc(
        {
            "doctype": "File",
            "file_name": safe,
            "content": raw,
            "attached_to_doctype": doctype,
            "attached_to_name": docname,
            "is_private": 0,
        }
    )
    file.save(ignore_permissions=True)
    return {"name": file.name, "file_url": file.file_url}


def pending_meters(customer):
    units = [u.unit for u in tenant_units(customer)]
    if not units:
        return 0
    return frappe.db.count("Utility Meter", {"unit": ["in", units], "status": "Active"})


@frappe.whitelist()
def get_meters(customer=None):
    ctx = tenant(customer, "operations")
    units = [u.unit for u in tenant_units(ctx["customer"])]
    if not units:
        return []
    meters = frappe.get_all(
        "Utility Meter",
        filters={"unit": ["in", units], "status": ["!=", "Inactive"]},
        fields=["name", "meter_number", "utility_type", "unit", "last_reading", "last_reading_date", "multiplier", "tariff", "status"],
    )
    for meter in meters:
        meter["uom"] = frappe.db.get_value("Utility Tariff", meter.tariff, "uom")
        meter["history"] = frappe.get_all(
            "Meter Reading",
            filters={"meter": meter.name, "status": ["!=", "Rejected"]},
            fields=["name", "reading_date", "current_reading", "consumption", "amount", "status"],
            order_by="reading_date desc, creation desc",
            limit=12,
        )
    return meters


@frappe.whitelist()
def submit_meter_reading(meter, reading, reading_date=None, customer=None):
    ctx = tenant(customer, "operations")
    if not cint(get_settings().allow_tenant_meter_readings):
        frappe.throw(_("Meter readings are captured by the management office."), frappe.PermissionError)
    units = {u.unit for u in tenant_units(ctx["customer"])}
    row = frappe.db.get_value("Utility Meter", meter, ["unit", "status"], as_dict=True)
    if not row or row.unit not in units:
        frappe.throw(_("That meter is not on your premises."), frappe.PermissionError)
    doc = frappe.get_doc(
        {
            "doctype": "Meter Reading",
            "meter": meter,
            "reading_date": reading_date or nowdate(),
            "current_reading": flt(reading),
            "source": "Tenant Portal",
            "status": "Approved",
        }
    )
    doc.insert(ignore_permissions=True)
    return {"name": doc.name, "status": doc.status, "consumption": doc.consumption, "amount": doc.amount}


@frappe.whitelist()
def get_sales_declarations(customer=None):
    ctx = tenant(customer, "operations")
    leases = frappe.get_all("Lease Agreement", filters={"customer": ctx["customer"], "docstatus": 1, "turnover_rent_applicable": 1, "status": ["in", list(ACTIVE_LEASE_STATUSES)]}, fields=["name", "property", "turnover_rent_percent"])
    declarations = frappe.get_all(
        "Tenant Sales Declaration",
        filters={"customer": ctx["customer"]},
        fields=["name", "lease", "period_start", "period_end", "gross_sales", "turnover_rent_due", "status", "base_rent_for_period"],
        order_by="period_start desc",
        limit=36,
    )
    return {"leases": leases, "declarations": declarations, "enabled": bool(cint(get_settings().allow_tenant_sales_declarations))}


@frappe.whitelist()
def submit_sales_declaration(lease, period_start, period_end, gross_sales, customer=None):
    ctx = tenant(customer, "operations")
    if not cint(get_settings().allow_tenant_sales_declarations):
        frappe.throw(_("Sales declarations are captured by the management office."), frappe.PermissionError)
    if frappe.db.get_value("Lease Agreement", lease, "customer") != ctx["customer"]:
        frappe.throw(_("Lease not found."), frappe.DoesNotExistError)
    doc = frappe.get_doc(
        {
            "doctype": "Tenant Sales Declaration",
            "lease": lease,
            "period_start": period_start,
            "period_end": period_end,
            "gross_sales": flt(gross_sales),
            "source": "Tenant Portal",
            "status": "Pending Approval",
        }
    )
    doc.insert(ignore_permissions=True)
    return {"name": doc.name, "turnover_rent_due": doc.turnover_rent_due}


def notices_for(customer, limit=20):
    properties = {row.property for row in tenant_units(customer)} | set(
        frappe.get_all("Lease Agreement", filters={"customer": customer, "docstatus": 1}, pluck="property")
    )
    now = now_datetime()
    rows = frappe.db.sql(
        """
        select n.name, n.title, n.priority, n.message, n.published_on, n.attachment, n.audience, n.property
        from "tabTenant Notice" n
        where n.status = 'Published' and (n.expires_on is null or n.expires_on > %s)
          and (
            n.audience = 'All Tenants'
            or (n.audience = 'Property' and n.property = any(%s))
            or (n.audience = 'Specific Tenants' and exists (
                select 1 from "tabTenant Notice Recipient" r where r.parent = n.name and r.customer = %s))
          )
        order by n.published_on desc nulls last limit %s
        """,
        (now, list(properties) or [""], customer, limit),
        as_dict=True,
    )
    return rows


@frappe.whitelist()
def get_notices(customer=None):
    ctx = tenant(customer)
    return notices_for(ctx["customer"], 50)


@frappe.whitelist()
def get_team(customer=None):
    ctx = tenant(customer, "manage")
    return frappe.db.sql(
        """
        select p.name, p.user, p.access_level, u.full_name, u.mobile_no
        from "tabTenant Portal User" p join "tabUser" u on u.name = p.user
        where p.parent = %s and p.parenttype = 'Customer'
        order by u.full_name
        """,
        (ctx["customer"],),
        as_dict=True,
    )


def portal_user(email, full_name, mobile):
    if frappe.db.exists("User", email):
        user = frappe.get_doc("User", email)
        if not user.mobile_no and mobile:
            user.mobile_no = mobile
            user.save(ignore_permissions=True)
    else:
        first, _sep, last = (full_name or email.split("@")[0]).partition(" ")
        user = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": first,
                "last_name": last,
                "mobile_no": mobile,
                "user_type": "Website User",
                "send_welcome_email": 0,
                "enabled": 1,
            }
        )
        user.insert(ignore_permissions=True)
    if TENANT_ROLE not in frappe.get_roles(email):
        user.add_roles(TENANT_ROLE)
    return user


@frappe.whitelist()
def invite_portal_user(customer, email, full_name, mobile=None, access_level="Owner"):
    if not is_staff():
        ctx = tenant(customer, "manage")
        customer = ctx["customer"]
    elif not frappe.db.exists("Customer", customer):
        frappe.throw(_("Unknown tenant."), frappe.DoesNotExistError)
    if access_level not in ACCESS:
        frappe.throw(_("Unknown access level."))
    email = (email or "").strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        frappe.throw(_("Enter a valid email address."))
    portal_user(email, full_name, mobile)
    doc = frappe.get_doc("Customer", customer)
    if any(row.user == email for row in doc.get("tenant_portal_users") or []):
        frappe.throw(_("{0} already has access.").format(email))
    doc.append("tenant_portal_users", {"user": email, "access_level": access_level})
    doc.save(ignore_permissions=True)
    settings = get_settings()
    if mobile:
        send_sms([mobile], _("Welcome to the BBS Mall tenant portal. Sign in with {0}, then tap Forgot password to set your password.").format(email))
    return True


@frappe.whitelist()
def remove_portal_user(customer, user):
    if not is_staff():
        ctx = tenant(customer, "manage")
        customer = ctx["customer"]
        if user == frappe.session.user:
            frappe.throw(_("You cannot remove your own access."))
    doc = frappe.get_doc("Customer", customer)
    doc.set("tenant_portal_users", [row for row in doc.tenant_portal_users if row.user != user])
    doc.save(ignore_permissions=True)
    return True


@frappe.whitelist()
def update_profile(mobile_no=None, full_name=None):
    user = frappe.get_doc("User", frappe.session.user)
    if mobile_no is not None:
        user.mobile_no = mobile_no
    if full_name:
        first, _sep, last = full_name.partition(" ")
        user.first_name = first
        user.last_name = last
    user.save(ignore_permissions=True)
    return True


def sync_portal_users(doc, method=None):
    for row in doc.get("tenant_portal_users") or []:
        if row.user and frappe.db.exists("User", row.user) and TENANT_ROLE not in frappe.get_roles(row.user):
            frappe.get_doc("User", row.user).add_roles(TENANT_ROLE)
