import frappe
from frappe.model.document import Document


class MaterialRequestItem(Document):


    doctype = 'Material Request Item'

    pass


def on_doctype_update():
    frappe.db.add_index("Material Request Item", ["item_code", "warehouse"])
