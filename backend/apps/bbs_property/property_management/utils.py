import frappe
from frappe.utils import add_days, add_months, cint, date_diff, flt, getdate, nowdate

FREQUENCY_MONTHS = {"Monthly": 1, "Quarterly": 3, "Half-Yearly": 6, "Annually": 12, "One-off": 0}
ACTIVE_LEASE_STATUSES = ("Active", "Expiring Soon")
OPEN_UNIT_STATES = ("Vacant", "Reserved", "Under Maintenance")


def get_settings():
    return frappe.get_single("Property Settings")


def months_for(frequency):
    return FREQUENCY_MONTHS.get(frequency or "Monthly", 1)


def sms_enabled():
    try:
        return bool(frappe.get_single("HostPinnacle Settings").enabled)
    except Exception:
        return False


def send_sms(phones, message):
    if not phones or not sms_enabled():
        return False
    from apps.erpnext.erpnext_integrations.hostpinnacle.sms import send_sms as dispatch

    previous = frappe.session.user
    frappe.session.user = "Administrator"
    try:
        return bool(dispatch(list(phones), message, success_msg=False))
    except Exception:
        frappe.log_error(title="Property SMS failed")
        return False
    finally:
        frappe.session.user = previous


def customer_phones(customer):
    phones = []
    row = frappe.db.get_value("Customer", customer, ["mobile_no"], as_dict=True)
    if row and row.mobile_no:
        phones.append(row.mobile_no)
    contact = frappe.db.sql(
        """
        select c.mobile_no, c.phone from "tabContact" c
        join "tabDynamic Link" dl on dl.parent = c.name and dl.parenttype = 'Contact'
        where dl.link_doctype = 'Customer' and dl.link_name = %s
        """,
        (customer,),
        as_dict=True,
    )
    for entry in contact:
        for value in (entry.mobile_no, entry.phone):
            if value and value not in phones:
                phones.append(value)
    return phones


def customer_emails(customer):
    emails = []
    row = frappe.db.get_value("Customer", customer, ["email_id"], as_dict=True)
    if row and row.email_id:
        emails.append(row.email_id)
    for entry in frappe.db.sql(
        """
        select ce.email_id from "tabContact Email" ce
        join "tabContact" c on c.name = ce.parent
        join "tabDynamic Link" dl on dl.parent = c.name and dl.parenttype = 'Contact'
        where dl.link_doctype = 'Customer' and dl.link_name = %s
        """,
        (customer,),
        as_dict=True,
    ):
        if entry.email_id and entry.email_id not in emails:
            emails.append(entry.email_id)
    return emails


def money(value):
    return flt(value, 2)


def next_period_start(start, frequency):
    return add_months(getdate(start), months_for(frequency))


def full_period_end(start, frequency):
    return add_days(next_period_start(start, frequency), -1)


def today():
    return getdate(nowdate())


def clamp(value, low, high):
    return max(low, min(high, value))


def percent_days(start, end, frame_start, frame_end):
    lo = max(getdate(start), getdate(frame_start))
    hi = min(getdate(end), getdate(frame_end))
    if lo > hi:
        return 0
    return date_diff(hi, lo) + 1


def as_int(value, default=0):
    return cint(value) if value not in (None, "") else default
