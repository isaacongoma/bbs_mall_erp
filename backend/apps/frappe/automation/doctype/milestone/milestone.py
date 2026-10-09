import frappe
from frappe.model.document import Document


class Milestone(Document):
    doctype = 'Milestone'

    _DOCTYPE_NAME = "Milestone"


    pass


def on_doctype_update():
    frappe.db.add_index("Milestone", ["reference_type", "reference_name"])
