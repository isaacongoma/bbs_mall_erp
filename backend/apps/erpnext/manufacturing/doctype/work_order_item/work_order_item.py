import frappe
from frappe.model.document import Document


class WorkOrderItem(Document):


    doctype = 'Work Order Item'

    pass


def on_doctype_update():
    frappe.db.add_index("Work Order Item", ["item_code", "source_warehouse"])
