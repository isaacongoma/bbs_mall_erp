import re

import frappe
from jinja2 import ChainableUndefined
from jinja2.sandbox import SandboxedEnvironment
from frappe import _
from frappe.utils import add_to_date, flt, now_datetime

from apps.bbs_marketplace.marketplace.utils import get_settings

STATUS_EVENTS = {
    ("Marketplace Order", "Pending Payment"): ["Order Placed"],
    ("Marketplace Order", "Processing"): ["Payment Received"],
    ("Marketplace Order", "Partially Shipped"): ["Order Partially Shipped"],
    ("Marketplace Order", "Shipped"): ["Order Shipped"],
    ("Marketplace Order", "Delivered"): ["Order Delivered"],
    ("Marketplace Order", "Cancelled"): ["Order Cancelled"],
    ("Marketplace Order", "Refunded"): ["Order Refunded"],
    ("Marketplace Order", "Failed"): ["Payment Failed"],
    ("Seller Order", "New"): ["New Order for Seller"],
    ("Seller Order", "Cancelled"): ["Seller Order Cancelled"],
    ("Return Request", "Requested"): ["Return Requested", "Seller Return Request"],
    ("Return Request", "Approved"): ["Return Approved"],
    ("Return Request", "Rejected"): ["Return Rejected"],
    ("Return Request", "Received"): ["Return Received"],
    ("Return Request", "Refunded"): ["Refund Issued"],
    ("Marketplace Shipment", "Out for Delivery"): ["Out for Delivery"],
    ("Marketplace Shipment", "Failed Delivery"): ["Delivery Failed"],
    ("Seller Withdrawal", "Pending Approval"): ["Withdrawal Requested", "Withdrawal Awaiting Approval"],
    ("Seller Withdrawal", "Approved"): ["Withdrawal Requested"],
    ("Seller Withdrawal", "Paid"): ["Withdrawal Paid"],
    ("Seller Withdrawal", "Failed"): ["Withdrawal Failed"],
    ("Seller Withdrawal", "Rejected"): ["Withdrawal Failed"],
    ("Marketplace Listing", "Pending Approval"): ["Listing Awaiting Review"],
    ("Marketplace Listing", "Approved"): ["Listing Approved"],
    ("Marketplace Listing", "Rejected"): ["Listing Rejected"],
    ("Marketplace Seller", "Pending Approval"): ["Seller Application Received"],
    ("Marketplace Seller", "Active"): ["Seller Approved"],
    ("Marketplace Seller", "Suspended"): ["Seller Suspended"],
    ("Seller Subscription", "Active"): ["Subscription Activated"],
    ("Seller Ad", "Active"): ["Ad Activated"],
}

AUDIENCE_OVERRIDES = {
    "Seller Return Request": "Seller",
    "Withdrawal Awaiting Approval": "Staff",
    "Listing Awaiting Review": "Staff",
    "Seller Application Received": "Staff",
}

DEDUPE_MINUTES = 5


def money(value):
    return "KSh {:,.2f}".format(flt(value))


def enabled():
    settings = get_settings()
    return bool(settings.notifications_enabled)


def queue_status(doc, status):
    if (doc.doctype, status) in STATUS_EVENTS:
        pending = doc.flags.get("pending_notifications") or []
        pending.append(status)
        doc.flags.pending_notifications = pending


def flush(doc, method=None):
    pending = doc.flags.get("pending_notifications") or []
    doc.flags.pending_notifications = []
    for status in pending:
        for event in STATUS_EVENTS.get((doc.doctype, status), []):
            notify(event, doc)


def on_field_change(doc, method=None):
    before = doc.get_doc_before_save()
    old = before.get("status") if before else None
    if old == doc.get("status"):
        return
    for event in STATUS_EVENTS.get((doc.doctype, doc.get("status")), []):
        notify(event, doc)


def notify(event, doc, **extra):
    try:
        if not enabled():
            return
        template = frappe.db.get_value("Marketplace Notification Template", event, ["name", "enabled", "audience", "send_email", "send_sms", "email_subject", "email_body", "sms_body"], as_dict=True)
        if not template or not template.enabled:
            return
        audience = AUDIENCE_OVERRIDES.get(event, template.audience)
        context = build_context(doc, extra)
        contacts = recipients(audience, doc, context)
        settings = get_settings()
        if template.send_email and settings.send_email_notifications:
            subject = render(template.email_subject or event, context)
            body = wrap_email(render(template.email_body or "", context), subject, context)
            for address in contacts["emails"]:
                queue_log(event, audience, "Email", address, doc, subject, body)
        if template.send_sms and settings.send_sms_notifications and template.sms_body:
            text = render(template.sms_body, context)
            for phone in contacts["phones"]:
                queue_log(event, audience, "SMS", phone, doc, None, text)
    except Exception:
        if frappe.in_test:
            raise
        frappe.log_error(title=f"Marketplace notification failed: {event}")


ENVIRONMENT = SandboxedEnvironment(autoescape=False, undefined=ChainableUndefined)


def render(template, context):
    return ENVIRONMENT.from_string(template).render(context).strip()


def order_of(doc):
    if doc.doctype == "Marketplace Order":
        return doc
    name = doc.get("marketplace_order")
    return frappe.get_doc("Marketplace Order", name) if name and frappe.db.exists("Marketplace Order", name) else None


def seller_of(doc):
    name = doc.get("seller") or (doc.name if doc.doctype == "Marketplace Seller" else None)
    return frappe.get_doc("Marketplace Seller", name) if name and frappe.db.exists("Marketplace Seller", name) else None


def amount_of(doc):
    for field in ("grand_total", "seller_net", "net_amount", "refund_amount", "total", "amount"):
        if doc.get(field) is not None and flt(doc.get(field)):
            return flt(doc.get(field))
    return 0.0


def tracking_of(doc, order):
    from apps.bbs_marketplace.marketplace import logistics

    rows = []
    if doc.doctype == "Marketplace Shipment":
        rows = [doc]
    elif doc.doctype == "Seller Order" and doc.get("shipment"):
        rows = [frappe.get_doc("Marketplace Shipment", doc.shipment)]
    elif order is not None:
        names = frappe.get_all("Marketplace Shipment", filters={"marketplace_order": order.name}, pluck="name")
        rows = [frappe.get_doc("Marketplace Shipment", name) for name in names]
    for shipment in rows:
        if shipment.get("tracking_no"):
            return shipment.tracking_no, logistics.tracking_url(shipment.get("courier"), shipment.tracking_no) or "", shipment.get("courier") or ""
    return "", "", ""


def build_context(doc, extra):
    settings = get_settings()
    order = order_of(doc)
    seller = seller_of(doc)
    base = (settings.storefront_url or "").rstrip("/")
    tracking_no, tracking_url, courier = tracking_of(doc, order)
    customer = (order.customer if order is not None else doc.get("customer")) or None
    customer_name = (order.recipient_name if order is not None and order.get("recipient_name") else None) or (frappe.db.get_value("Customer", customer, "customer_name") if customer else "")
    context = {
        "doc": doc,
        "order": order,
        "seller": seller,
        "brand": settings.brand_name or "BBS Mall",
        "support_phone": settings.support_phone or "",
        "support_email": settings.support_email or "",
        "order_url": f"{base}/orders/{order.name}" if base and order is not None else "",
        "cart_url": f"{base}/cart" if base else "",
        "customer_name": customer_name or _("Customer"),
        "seller_name": seller.seller_name if seller else "",
        "tracking_no": tracking_no,
        "tracking_url": tracking_url,
        "courier": courier,
        "amount": money(amount_of(doc)),
        "money": money,
        "reason": doc.get("cancel_reason") or doc.get("failure_reason") or doc.get("decision_note") or doc.get("moderation_notes") or "",
        "desk_url": "",
    }
    context.update(extra)
    return context


def valid_email(value):
    return bool(value) and bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", str(value)))


def customer_contacts(customer):
    emails, phones = [], []
    if not customer:
        return emails, phones
    row = frappe.db.get_value("Customer", customer, ["email_id", "mobile_no", "marketplace_user"], as_dict=True)
    if row:
        emails += [row.email_id, row.marketplace_user]
        phones.append(row.mobile_no)
    return emails, phones


def recipients(audience, doc, context):
    emails, phones = [], []
    order = context["order"]
    seller = context["seller"]
    if audience == "Buyer":
        customer = order.customer if order is not None else doc.get("customer")
        found_emails, found_phones = customer_contacts(customer)
        emails += found_emails
        phones += found_phones
        if order is not None:
            phones.insert(0, order.get("recipient_phone"))
        phones = [next((value for value in phones if format_phone(value)), None)]
    elif audience == "Seller" and seller is not None:
        emails.append(seller.contact_email)
        phones.append(seller.contact_phone)
        found_emails, found_phones = customer_contacts(seller.customer)
        if not emails[0]:
            emails += found_emails
        if not phones[0]:
            phones += found_phones
    elif audience == "Staff":
        managers = frappe.db.sql(
            """
            select u.email, u.mobile_no from "tabUser" u
            join "tabHas Role" r on r.parent = u.name and r.parenttype = 'User'
            where r.role = 'Marketplace Manager' and u.enabled = 1
            """,
            as_dict=True,
        )
        emails += [row.email for row in managers]
        phones += [row.mobile_no for row in managers]
        emails += [line.strip() for line in (get_settings().staff_notification_emails or "").splitlines()]
    emails = list(dict.fromkeys(address.strip().lower() for address in emails if valid_email(address)))
    phones = list(dict.fromkeys(phone for phone in (format_phone(value) for value in phones) if phone))
    return {"emails": emails, "phones": phones}


def format_phone(phone):
    from apps.erpnext.erpnext_integrations.hostpinnacle.sms import format_phone as normalise

    return normalise(phone) if phone else None


def wrap_email(body, subject, context):
    brand = context["brand"]
    footer = context["support_phone"] or context["support_email"]
    contact = f"<p style='color:#6b7280;font-size:12px'>{_('Need help?')} {footer}</p>" if footer else ""
    return (
        "<div style='font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#111827'>"
        f"<div style='background:#f97316;color:#fff;padding:16px 24px;font-size:20px;font-weight:bold'>{brand}</div>"
        f"<div style='padding:24px;border:1px solid #e5e7eb;border-top:0'>{body}{contact}</div>"
        f"<p style='text-align:center;color:#9ca3af;font-size:11px'>{brand}</p>"
        "</div>"
    )


def queue_log(event, audience, channel, recipient, doc, subject, message, force=False):
    since = add_to_date(now_datetime(), minutes=-DEDUPE_MINUTES)
    duplicate = not force and frappe.db.exists(
        "Marketplace Notification Log",
        {"event_name": event, "reference_name": doc.name, "channel": channel, "recipient": recipient, "status": ["in", ["Queued", "Sent"]], "creation": [">", since]},
    )
    if duplicate:
        return None
    log = frappe.get_doc(
        {
            "doctype": "Marketplace Notification Log",
            "event_name": event,
            "audience": audience,
            "channel": channel,
            "recipient": recipient,
            "reference_doctype": doc.doctype,
            "reference_name": doc.name,
            "subject": subject,
            "message": message,
            "status": "Queued",
        }
    )
    log.flags.ignore_permissions = True
    log.insert()
    frappe.enqueue(deliver, queue="short", enqueue_after_commit=True, log=log.name)
    return log.name


def sms_ready():
    try:
        return bool(frappe.get_single("HostPinnacle Settings").enabled)
    except Exception:
        return False


def deliver(log):
    row = frappe.db.get_value("Marketplace Notification Log", log, ["name", "status", "channel", "recipient", "subject", "message"], as_dict=True)
    if not row or row.status != "Queued":
        return
    status, error = "Sent", None
    previous = frappe.session.user
    frappe.session.user = "Administrator"
    try:
        if row.channel == "Email":
            frappe.sendmail(recipients=[row.recipient], subject=row.subject, message=row.message, now=True)
        elif not sms_ready():
            status, error = "Skipped", _("SMS is not enabled in HostPinnacle Settings")
        else:
            from apps.erpnext.erpnext_integrations.hostpinnacle.sms import send_sms

            if not send_sms([row.recipient], row.message, success_msg=False):
                status, error = "Failed", _("The SMS gateway did not accept the message")
    except Exception as exc:
        status, error = "Failed", str(exc)[:500]
        frappe.log_error(title="Marketplace notification delivery failed")
    finally:
        frappe.session.user = previous
    frappe.db.set_value(
        "Marketplace Notification Log",
        log,
        {"status": status, "error": error, "sent_on": now_datetime() if status == "Sent" else None},
        update_modified=False,
    )


def retry_failed():
    names = frappe.get_all("Marketplace Notification Log", filters={"status": "Failed", "creation": [">", add_to_date(now_datetime(), hours=-24)]}, pluck="name", limit=100)
    for name in names:
        frappe.db.set_value("Marketplace Notification Log", name, "status", "Queued", update_modified=False)
        deliver(name)


@frappe.whitelist()
def resend(log):
    frappe.only_for(("Marketplace Manager", "System Manager"))
    frappe.db.set_value("Marketplace Notification Log", log, {"status": "Queued", "error": None}, update_modified=False)
    deliver(log)
    return frappe.db.get_value("Marketplace Notification Log", log, "status")


@frappe.whitelist()
def send_test(event, email=None, phone=None):
    frappe.only_for(("Marketplace Manager", "System Manager"))
    doctypes = [doctype for (doctype, _status), events in STATUS_EVENTS.items() if event in events]
    if not doctypes:
        frappe.throw(_("{0} is sent from jobs and cannot be tested this way").format(event))
    doctype = doctypes[0]
    name = frappe.db.get_value(doctype, {}, "name", order_by="creation desc")
    if not name:
        frappe.throw(_("Create a {0} first so the test has real details").format(doctype))
    template = frappe.get_doc("Marketplace Notification Template", event)
    doc = frappe.get_doc(doctype, name)
    context = build_context(doc, {})
    sent = []
    if email and template.send_email:
        subject = render(template.email_subject or event, context)
        queue_log(event, "Test", "Email", email, doc, "[TEST] " + subject, wrap_email(render(template.email_body or "", context), subject, context), force=True)
        sent.append(email)
    if phone and template.send_sms and template.sms_body:
        queue_log(event, "Test", "SMS", format_phone(phone) or phone, doc, None, render(template.sms_body, context), force=True)
        sent.append(phone)
    return _("Test sent to {0} using {1} {2}").format(", ".join(sent) or _("nobody"), doctype, name)
