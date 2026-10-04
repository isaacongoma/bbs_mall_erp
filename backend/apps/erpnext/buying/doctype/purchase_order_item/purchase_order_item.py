import frappe
from frappe.model.document import Document


class PurchaseOrderItem(Document):


    doctype = 'Purchase Order Item'

    pass


def on_doctype_update():
    frappe.db.add_index("Purchase Order Item", ["item_code", "warehouse"])
