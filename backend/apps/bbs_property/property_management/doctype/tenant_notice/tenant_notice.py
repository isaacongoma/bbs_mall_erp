import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cint, get_datetime, now_datetime, strip_html

from apps.bbs_property.property_management.utils import ACTIVE_LEASE_STATUSES, customer_emails, customer_phones, send_sms


class TenantNotice(Document):
    doctype = "Tenant Notice"

    def validate(self):
        if self.audience == "Property" and not self.property:
            frappe.throw(_("Select the property this notice is for."))
        if self.audience == "Specific Tenants" and not self.recipients:
            frappe.throw(_("Add at least one tenant."))
        if self.expires_on and self.publish_on and get_datetime(self.expires_on) <= get_datetime(self.publish_on):
            frappe.throw(_("Expiry must be after the publish time."))

    def audience_customers(self):
        if self.audience == "Specific Tenants":
            return sorted({row.customer for row in self.recipients})
        filters = {"docstatus": 1, "status": ["in", list(ACTIVE_LEASE_STATUSES)]}
        if self.audience == "Property":
            filters["property"] = self.property
        return sorted(set(frappe.get_all("Lease Agreement", filters=filters, pluck="customer")))

    @frappe.whitelist()
    def publish(self):
        self.check_permission("write")
        if self.status == "Published":
            frappe.throw(_("This notice is already published."))
        customers = self.audience_customers()
        self.status = "Published"
        self.published_on = now_datetime()
        self.recipient_count = len(customers)
        self.save()
        if cint(self.send_sms):
            body = f"{self.title}: {strip_html(self.message)[:300]}"
            for customer in customers:
                send_sms(customer_phones(customer)[:1], body)
        if cint(self.send_email):
            for customer in customers:
                emails = customer_emails(customer)
                if emails:
                    frappe.sendmail(recipients=emails[:1], subject=self.title, message=self.message, reference_doctype=self.doctype, reference_name=self.name)
        return self.recipient_count
