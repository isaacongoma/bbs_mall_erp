import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, now_datetime, nowdate

from apps.bbs_property.property_management import billing
from apps.bbs_property.property_management.doctype.lease_agreement.lease_agreement import sync_units
from apps.bbs_property.property_management.utils import (
    ACTIVE_LEASE_STATUSES,
    customer_emails,
    customer_phones,
    get_settings,
    send_sms,
)


def update_lease_statuses():
    today = getdate(nowdate())
    alert = cint(get_settings().lease_expiry_alert_days)
    for name in frappe.get_all("Lease Agreement", filters={"docstatus": 1, "status": ["in", list(ACTIVE_LEASE_STATUSES) + ["Active"]]}, pluck="name"):
        lease = frappe.get_doc("Lease Agreement", name)
        status = lease.status
        end = getdate(lease.termination_date or lease.end_date)
        if end < today:
            status = "Terminated" if lease.termination_date else "Expired"
        elif alert and end <= add_days(today, alert):
            status = "Expiring Soon"
        else:
            status = "Active"
        if status != lease.status:
            lease.db_set("status", status, update_modified=False)
        sync_units(frappe.get_doc("Lease Agreement", name))
        billing.refresh_lease_totals(name)
    renew_automatic_leases()


def renew_automatic_leases():
    today = getdate(nowdate())
    for name in frappe.get_all(
        "Lease Agreement",
        filters={"docstatus": 1, "auto_renew": 1, "status": ["in", ["Active", "Expiring Soon"]], "end_date": ["<=", add_days(today, 1)]},
        pluck="name",
    ):
        lease = frappe.get_doc("Lease Agreement", name)
        if frappe.db.exists("Lease Agreement", {"renewal_of": name, "docstatus": ["<", 2]}):
            continue
        renewal = frappe.get_doc(lease.make_renewal())
        renewal.insert(ignore_permissions=True)
        renewal.submit()
        lease.db_set("status", "Renewed", update_modified=False)


def generate_due_invoices():
    settings = get_settings()
    if not cint(settings.auto_generate_invoices) or not settings.rent_item:
        return 0
    created = 0
    for lease in billing.due_leases(automatic_only=True):
        loops = 0
        while loops < 12 and billing.is_due(lease, nowdate(), settings):
            period = billing.next_period(lease)
            try:
                invoice = billing.make_lease_invoice(
                    lease,
                    period[0],
                    period[1],
                    posting_date=nowdate(),
                    submit=cint(settings.submit_invoices_automatically),
                )
            except Exception:
                frappe.log_error(title=f"Lease invoicing failed: {lease.name}")
                break
            loops += 1
            lease = frappe.get_doc("Lease Agreement", lease.name)
            if invoice is None:
                break
            created += 1
            if cint(settings.send_invoice_by_email) and invoice.docstatus == 1:
                email_invoice(invoice)
    return created


def email_invoice(invoice):
    emails = customer_emails(invoice.customer)
    if not emails:
        return
    try:
        frappe.sendmail(
            recipients=emails[:1],
            subject=_("Invoice {0}").format(invoice.name),
            message=_("Dear {0}, please find invoice {1} for {2}. Due on {3}.").format(invoice.customer_name, invoice.name, flt(invoice.grand_total, 2), invoice.due_date),
            reference_doctype="Sales Invoice",
            reference_name=invoice.name,
        )
    except Exception:
        frappe.log_error(title=f"Invoice email failed: {invoice.name}")


def apply_late_fees():
    return billing.apply_late_fees()


def reminder_text(template, invoice, settings):
    return (template or "").format(
        tenant=invoice.customer_name,
        invoice=invoice.name,
        amount=f"{flt(invoice.outstanding_amount):,.2f}",
        due_date=invoice.due_date,
        paybill=settings.mpesa_paybill or settings.mpesa_till or "",
        account=invoice.customer,
    )


def send_payment_reminders():
    settings = get_settings()
    today = getdate(nowdate())
    before = cint(settings.reminder_days_before_due)
    repeat = max(1, cint(settings.overdue_reminder_every_days))
    for name in frappe.get_all(
        "Sales Invoice",
        filters={"docstatus": 1, "is_lease_invoice": 1, "outstanding_amount": [">", 0]},
        pluck="name",
    ):
        invoice = frappe.get_doc("Sales Invoice", name)
        due = getdate(invoice.due_date)
        days_to_due = (due - today).days
        template = None
        if days_to_due == before:
            template = settings.reminder_sms_template
        elif days_to_due < 0 and (-days_to_due) % repeat == 0:
            template = settings.overdue_sms_template
        if not template:
            continue
        if cint(settings.send_sms_reminders):
            send_sms(customer_phones(invoice.customer)[:1], reminder_text(template, invoice, settings))
        if cint(settings.send_email_reminders):
            emails = customer_emails(invoice.customer)
            if emails:
                try:
                    frappe.sendmail(
                        recipients=emails[:1],
                        subject=_("Payment reminder: {0}").format(invoice.name),
                        message=reminder_text(template, invoice, settings),
                        reference_doctype="Sales Invoice",
                        reference_name=invoice.name,
                    )
                except Exception:
                    frappe.log_error(title=f"Reminder email failed: {invoice.name}")


def send_lease_expiry_alerts():
    settings = get_settings()
    alert = cint(settings.lease_expiry_alert_days)
    if not alert:
        return
    horizon = add_days(getdate(nowdate()), alert)
    expiring = frappe.get_all(
        "Lease Agreement",
        filters={"docstatus": 1, "status": ["in", ["Active", "Expiring Soon"]], "end_date": ["between", [nowdate(), horizon]]},
        fields=["name", "tenant_name", "property", "end_date"],
        order_by="end_date asc",
    )
    marks = {1, 7, 30, alert}
    due_today = [row for row in expiring if (getdate(row.end_date) - getdate(nowdate())).days in marks]
    if not due_today:
        return
    recipients = {line.strip() for line in (settings.expiry_alert_recipients or "").splitlines() if line.strip()}
    for row in due_today:
        manager = frappe.db.get_value("Property", row.property, "manager")
        if manager:
            recipients.add(manager)
    body = "<br>".join(f"{row.name} - {row.tenant_name} ({row.property}) ends {row.end_date}" for row in due_today)
    if recipients:
        frappe.sendmail(recipients=sorted(recipients), subject=_("Leases expiring soon"), message=body)
    for user in {u for u in recipients if frappe.db.exists("User", u)}:
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "for_user": user,
                "type": "Alert",
                "subject": _("{0} lease(s) expiring soon").format(len(due_today)),
                "document_type": "Lease Agreement",
                "document_name": due_today[0].name,
            }
        ).insert(ignore_permissions=True)


def publish_scheduled_notices():
    now = now_datetime()
    for name in frappe.get_all("Tenant Notice", filters={"status": "Draft", "publish_on": ["<=", now]}, pluck="name"):
        try:
            frappe.get_doc("Tenant Notice", name).publish()
        except Exception:
            frappe.log_error(title=f"Notice publish failed: {name}")
    for name in frappe.get_all("Tenant Notice", filters={"status": "Published", "expires_on": ["<", now]}, pluck="name"):
        frappe.db.set_value("Tenant Notice", name, "status", "Expired", update_modified=False)


def refresh_property_metrics():
    from apps.bbs_property.property_management.doctype.property.property import refresh_property_metrics as refresh

    for name in frappe.get_all("Property", pluck="name"):
        refresh(name)
