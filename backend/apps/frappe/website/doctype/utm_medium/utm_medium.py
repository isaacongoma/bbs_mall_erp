import frappe
from frappe.model.document import Document


class UTMMedium(Document):
    doctype = 'UTM Medium'

    _DOCTYPE_NAME = "UTM Medium"


    def before_save(self):
        if self.slug:
            self.slug = frappe.utils.slug(self.slug)
