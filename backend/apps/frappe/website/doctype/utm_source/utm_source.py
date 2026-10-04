import frappe
from frappe.model.document import Document


class UTMSource(Document):
    doctype = 'UTM Source'

    _DOCTYPE_NAME = "UTM Source"


    def before_save(self):
        if self.slug:
            self.slug = frappe.utils.slug(self.slug)
