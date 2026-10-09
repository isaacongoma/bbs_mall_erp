import frappe
from frappe import _

from erpnext import get_region


def check_deletion_permission(doc, method):
    region = get_region(doc.company)
    if region in ["Nepal"] and doc.docstatus != 0:
        frappe.throw(_("Deletion is not permitted for country {0}").format(region))
