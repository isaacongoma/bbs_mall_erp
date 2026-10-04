import frappe
from frappe.model.document import Document


class UTMCampaign(Document):
    doctype = 'UTM Campaign'

    _DOCTYPE_NAME = "UTM Campaign"


    def before_save(self):
        if self.slug:
            self.slug = frappe.utils.slug(self.slug)
