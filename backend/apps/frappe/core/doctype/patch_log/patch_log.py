import frappe
from frappe.model.document import Document


class PatchLog(Document):
    doctype = 'Patch Log'

    _DOCTYPE_NAME = "Patch Log"


    pass


def before_migrate():
    frappe.reload_doc("core", "doctype", "patch_log")
