import json
import re

import frappe
from frappe import _
from frappe.utils import flt, now_datetime, nowdate

import requests

SETTINGS = "HostPinnacle Settings"
FAILED_STATUSES = {"error", "fail", "failed"}
CHARACTER_MAP = (
    ("–", "-"),
    ("—", "-"),
    ("‘", "'"),
    ("’", "'"),
    ("“", '"'),
    ("”", '"'),
    ("…", "..."),
)


def form_post(url, data):
    response = requests.post(
        url,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    return response.status_code, response.text


HTTP = {"call": form_post}


def format_phone(phone):
    if not phone:
        return None
    digits = re.sub(r"\D", "", str(phone).strip())
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9:
        return "254" + digits
    return None


def normalize_recipients(receivers):
    if isinstance(receivers, str):
        receivers = receivers.split(",")
    formatted = [format_phone(number) for number in receivers or []]
    return [number for number in formatted if number]


def sanitize_message(message):
    for original, replacement in CHARACTER_MAP:
        message = message.replace(original, replacement)
    return message.encode("ascii", "ignore").decode("ascii")


def get_settings():
    return frappe.get_doc(SETTINGS)


def refresh_balance():
    settings = get_settings()
    if not settings.user_id or not settings.get_password("password", raise_exception=False):
        return None
    status, text = HTTP["call"](
        f"{settings.api_base_url.rstrip('/')}/account/readstatus",
        {"userid": settings.user_id, "password": settings.get_password("password"), "output": "json"},
    )
    if status != 200:
        return None
    try:
        balance = json.loads(text)["response"]["account"]["smsBalance"]
    except (ValueError, KeyError, TypeError):
        return None
    frappe.db.set_single_value(SETTINGS, {"sms_balance": flt(balance), "balance_updated_on": now_datetime()})
    return flt(balance)


def create_sms_log(message, sender_name, requested, sent):
    log = frappe.new_doc("SMS Log")
    log.sent_on = nowdate()
    log.sender_name = sender_name
    log.message = message
    log.no_of_requested_sms = len(requested)
    log.requested_numbers = "\n".join(requested)
    log.no_of_sent_sms = len(sent)
    log.sent_to = "\n".join(sent)
    log.flags.ignore_permissions = True
    log.insert()
    return log


def send_sms(receiver_list, msg, sender_name="", success_msg=True):
    if isinstance(receiver_list, str) and receiver_list.lstrip().startswith("["):
        receiver_list = json.loads(receiver_list)
    settings = get_settings()
    if not settings.enabled:
        frappe.msgprint(_("HostPinnacle SMS is disabled in settings"))
        return False
    if flt(settings.sms_balance) < flt(settings.minimum_balance or 1):
        frappe.msgprint(_("SMS balance is low or missing"))
        return False
    numbers = normalize_recipients(receiver_list)
    if not numbers:
        frappe.msgprint(_("Invalid phone number(s): {0}").format(receiver_list))
        return False
    message = sanitize_message(frappe.safe_decode(msg))
    if not message:
        return False
    status, text = HTTP["call"](
        f"{settings.api_base_url.rstrip('/')}/send",
        {
            "userid": settings.user_id,
            "password": settings.get_password("password"),
            "senderid": settings.sender_id,
            "sendMethod": "quick",
            "msgType": "text",
            "output": "json",
            "duplicatecheck": "false",
            "msg": message,
            "mobile": ",".join(numbers),
        },
    )
    refresh_balance()
    if status != 200:
        frappe.log_error(title="HostPinnacle SMS error", message=text)
        return False
    try:
        result = json.loads(text)
    except ValueError:
        frappe.log_error(title="HostPinnacle SMS response parse error", message=text)
        return False
    if str((result.get("response") or {}).get("status", "")).lower() in FAILED_STATUSES:
        frappe.log_error(title="HostPinnacle SMS rejected", message=text)
        return False
    create_sms_log(message, sender_name, numbers, numbers)
    if success_msg:
        frappe.msgprint(_("SMS sent successfully"))
    return result
