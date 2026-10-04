import frappe
from frappe.model.document import Document
from frappe.model.naming import set_name_by_naming_series


class Campaign(Document):


    doctype = 'Campaign'

    def after_insert(self):
        self.sync_utm_campaign()

    def on_change(self):
        self.sync_utm_campaign()

    def sync_utm_campaign(self):
        mc = self.get_utm_campaign_mirror()
        mc.campaign_description = self.description
        mc.crm_campaign = self.name
        mc.save(ignore_permissions=True)

    def get_utm_campaign_mirror(self):
        if owned := frappe.db.get_value("UTM Campaign", {"crm_campaign": self.name}):
            return frappe.get_doc("UTM Campaign", owned)

        if frappe.db.exists("UTM Campaign", self.campaign_name):
            same_name = frappe.get_doc("UTM Campaign", self.campaign_name)
            if not same_name.crm_campaign or same_name.crm_campaign == self.name:
                return same_name

        mc = frappe.new_doc("UTM Campaign")
        mc.name = self.name if frappe.db.exists("UTM Campaign", self.campaign_name) else self.campaign_name
        return mc

    def autoname(self):
        if frappe.defaults.get_global_default("campaign_naming_by") != "Naming Series":
            self.name = self.campaign_name
        else:
            set_name_by_naming_series(self)
