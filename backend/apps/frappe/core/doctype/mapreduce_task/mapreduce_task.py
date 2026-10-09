import frappe
from frappe.model.document import Document


class MapReduceTask(Document):


    doctype = 'MapReduce Task'

    _DOCTYPE_NAME = "MapReduce Task"


def on_doctype_update():
    frappe.db.add_index("MapReduce Task", ["master", "status"])
