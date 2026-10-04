import frappe
from frappe.model.document import Document


class SalesOrderItem(Document):


    doctype = 'Sales Order Item'

    pass


def on_doctype_update():
    frappe.db.add_index("Sales Order Item", ["item_code", "warehouse"])
