import frappe
from frappe.model.document import Document


class SerialandBatchEntry(Document):


    doctype = 'Serial and Batch Entry'

    pass


def on_doctype_update():
    frappe.db.add_index("Serial and Batch Entry", ["warehouse", "batch_no", "posting_datetime"])
    frappe.db.add_index("Serial and Batch Entry", ["warehouse", "serial_no", "posting_datetime"])
