import frappe
from frappe.model.document import Document


class CommunicationLink(Document):
    doctype = 'Communication Link'

    _DOCTYPE_NAME = "Communication Link"


    pass


def on_doctype_update():
    frappe.db.add_index("Communication Link", ["link_doctype", "link_name"])
    frappe.db.add_index("Communication Link", ["link_doctype", "link_name", "communication_date", "parent"])
