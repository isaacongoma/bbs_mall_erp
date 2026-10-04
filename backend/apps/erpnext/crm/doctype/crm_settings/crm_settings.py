import frappe
from frappe import _
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from frappe.model.document import Document

from erpnext.crm.frappe_crm_api import is_crm_installed


class CRMSettings(Document):


    doctype = 'CRM Settings'

    def validate(self):
        frappe.db.set_default("campaign_naming_by", self.get("campaign_naming_by", ""))
        self.validate_enable_opportunity_creation_from_contact_us()
        self.validate_allowed_users()

    def validate_enable_opportunity_creation_from_contact_us(self):
        contact_disabled = frappe.get_single_value("Contact Us Settings", "is_disabled")

        if self.enable_opportunity_creation_from_contact_us and contact_disabled:
            frappe.throw(
                _(
                    "Cannot enable Opportunity creation from Contact Us because the Contact Us form is disabled."
                )
            )

    def validate_allowed_users(self):
        if self.enable_frappe_crm_data_synchronization and not (is_crm_installed() or self.allowed_users):
            frappe.throw(
                _(
                    "Please add at least one user on Allowed Users to allow Data Synchronization from Frappe CRM site."
                )
            )

        if self.enable_frappe_crm_data_synchronization and is_crm_installed() and self.allowed_users:
            frappe.throw(_("Allowed Users is not required as Frappe CRM is already installed on the site."))

    def before_save(self):
        self.clear_allowed_users()

    def on_update(self):
        self.custom_fields_for_frappe_crm_data_sync()

    def clear_allowed_users(self):
        if not self.enable_frappe_crm_data_synchronization:
            self.allowed_users = []

    def custom_fields_for_frappe_crm_data_sync(self):
        custom_fields = self.get_frappe_crm_custom_fields()

        if self.enable_frappe_crm_data_synchronization:
            create_custom_fields(custom_fields, ignore_validate=True)

    @staticmethod
    def get_frappe_crm_custom_fields():
        custom_fields = {
            "Quotation": [
                {
                    "fieldname": "crm_deal",
                    "fieldtype": "Data",
                    "label": "Frappe CRM Deal",
                    "insert_after": "party_name",
                }
            ],
            "Customer": [
                {
                    "fieldname": "crm_deal",
                    "fieldtype": "Data",
                    "label": "Frappe CRM Deal",
                    "insert_after": "prospect_name",
                }
            ],
        }

        return custom_fields
