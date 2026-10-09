import re

import frappe
from frappe import _

from erpnext.regional.kenya.data import KRA_PIN_PATTERN


def validate_kra_pin(doc, method=None):
    pin = doc.get("kra_pin")
    if not pin:
        return
    pin = pin.strip().upper()
    if not re.match(KRA_PIN_PATTERN, pin):
        frappe.throw(_("Invalid KRA PIN {0}. Expected format: A123456789Z").format(pin), title=_("Invalid KRA PIN"))
    doc.kra_pin = pin
