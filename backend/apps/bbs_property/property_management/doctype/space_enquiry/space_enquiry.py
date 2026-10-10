import frappe
from frappe import _
from frappe.model.document import Document


class SpaceEnquiry(Document):
    doctype = "Space Enquiry"

    def validate(self):
        if self.unit and self.property and frappe.db.get_value("Rentable Unit", self.unit, "property") != self.property:
            frappe.throw(_("Unit {0} is not in {1}.").format(self.unit, self.property))
        if self.status == "Lost" and not self.lost_reason:
            frappe.throw(_("Record why the enquiry was lost."))

    @frappe.whitelist()
    def make_lease(self):
        self.check_permission("write")
        customer = self.customer
        if not customer:
            existing = frappe.db.get_value("Customer", {"customer_name": self.prospect_name})
            if existing:
                customer = existing
            else:
                doc = frappe.new_doc("Customer")
                doc.customer_name = self.prospect_name
                doc.customer_type = "Company"
                doc.customer_group = frappe.db.get_single_value("Selling Settings", "customer_group") or "Commercial"
                doc.territory = frappe.db.get_single_value("Selling Settings", "territory") or "All Territories"
                doc.mobile_no = self.contact_phone
                doc.email_id = self.contact_email
                doc.is_tenant = 1
                doc.insert(ignore_permissions=True)
                customer = doc.name
        self.db_set({"customer": customer, "status": "Won"})
        values = {"customer": customer, "property": self.property, "trading_name": self.prospect_name, "units": []}
        if self.unit:
            unit = frappe.db.get_value("Rentable Unit", self.unit, ["base_rent", "service_charge"], as_dict=True)
            values["units"].append({"unit": self.unit, "monthly_rent": unit.base_rent, "monthly_service_charge": unit.service_charge})
        return values
