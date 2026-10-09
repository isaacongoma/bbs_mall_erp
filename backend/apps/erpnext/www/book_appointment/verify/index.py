import frappe
from frappe import _
from frappe.utils import add_to_date, now_datetime
from frappe.utils.data import sha256_hash

from erpnext.crm.doctype.appointment.appointment import get_verification_link_expiry


def get_context(context):
    key = frappe.form_dict.get("key")
    if not key:
        context.success = False
        return context

    appointment_name = frappe.db.get_value("Appointment", {"verification_token": sha256_hash(key)}, "name")
    if not appointment_name:
        context.success = False
        context.message = _("This verification link is invalid. Please book the appointment again.")
        return context

    appointment = frappe.get_doc("Appointment", appointment_name)

    if appointment.status == "Closed":
        context.success = False
        context.message = _("Appointment has been closed. Please book the appointment again.")
        return context

    if appointment.status == "Open":
        context.success = True
        context.message = _("Appointment is already verified.")
        return context

    if now_datetime() > add_to_date(appointment.creation, minutes=get_verification_link_expiry()):
        context.success = False
        context.message = _("Verification link has expired.")
        return context

    verify_appointment(appointment)
    frappe.local.flags.commit = True
    context.success = True
    return context


def verify_appointment(appointment):
    visitor = frappe.session.user
    try:
        frappe.set_user("Administrator")
        appointment.email_verified = True
        appointment.status = "Open"
        appointment.save(ignore_permissions=True)
    finally:
        frappe.set_user(visitor)
