import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint


class PrintSettings(Document):
    doctype = 'Print Settings'

    _DOCTYPE_NAME = "Print Settings"


    def validate(self):
        if self.pdf_page_size == "Custom" and not (self.pdf_page_height and self.pdf_page_width):
            frappe.throw(_("Page height and width cannot be zero"))

    def on_update(self):
        frappe.clear_cache()


@frappe.whitelist()
def is_print_server_enabled():
    return frappe.get_single_value("Print Settings", "enable_print_server")
