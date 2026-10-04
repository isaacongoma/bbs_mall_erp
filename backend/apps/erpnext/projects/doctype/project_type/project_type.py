import frappe
from frappe import _
from frappe.model.document import Document


class ProjectType(Document):


    doctype = 'Project Type'

    def on_trash(self):
        if self.name == "External":
            frappe.throw(_("You cannot delete Project Type 'External'"))
