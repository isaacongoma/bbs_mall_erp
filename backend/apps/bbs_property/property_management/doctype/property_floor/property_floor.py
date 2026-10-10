import frappe
from frappe import _
from frappe.model.document import Document


class PropertyFloor(Document):
    doctype = "Property Floor"

    def autoname(self):
        self.name = f"{self.property}-{self.floor_name}".strip()

    def validate(self):
        if frappe.db.exists("Property Floor", {"property": self.property, "level": self.level, "name": ["!=", self.name or ""]}):
            frappe.throw(_("Level {0} already exists in {1}.").format(self.level, self.property))
