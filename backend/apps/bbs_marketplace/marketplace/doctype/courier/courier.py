import secrets

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class Courier(Document):
    doctype = "Courier"

    def validate(self):
        if not self.webhook_token:
            self.webhook_token = secrets.token_urlsafe(20)
        seen = set()
        for row in self.rates:
            key = (row.zone, row.service_level, flt(row.min_weight))
            if key in seen:
                frappe.throw(_("Rate row {0} repeats {1} {2} from {3} kg").format(row.idx, row.zone, row.service_level, row.min_weight))
            seen.add(key)
            if flt(row.max_weight) and flt(row.max_weight) <= flt(row.min_weight):
                frappe.throw(_("Rate row {0}: the upper weight must exceed the lower weight").format(row.idx))
