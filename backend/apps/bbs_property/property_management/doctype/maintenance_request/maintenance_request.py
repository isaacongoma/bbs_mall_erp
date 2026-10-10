import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, add_to_date, cint, flt, now_datetime, nowdate

from apps.bbs_property.property_management import billing
from apps.bbs_property.property_management.utils import get_settings, send_sms, customer_phones

CLOSED_STATES = ("Resolved", "Closed", "Cancelled")


class MaintenanceRequest(Document):
    doctype = "Maintenance Request"

    def before_insert(self):
        self.opened_on = now_datetime()
        hours = cint(get_settings().maintenance_sla_hours) or 48
        urgent = {"Urgent": 0.125, "High": 0.5, "Medium": 1, "Low": 2}.get(self.priority, 1)
        self.due_by = add_to_date(self.opened_on, hours=hours * urgent)

    def validate(self):
        if self.unit:
            unit = frappe.db.get_value("Rentable Unit", self.unit, ["property", "current_tenant", "current_lease"], as_dict=True)
            if unit.property != self.property:
                frappe.throw(_("Unit {0} is not in {1}.").format(self.unit, self.property))
            if not self.customer and unit.current_tenant:
                self.customer = unit.current_tenant
            if not self.lease and unit.current_lease:
                self.lease = unit.current_lease
        if self.assigned_to and self.status == "Open":
            self.status = "Assigned"
        before = self.get_doc_before_save()
        changed = before and before.status != self.status
        if changed:
            if self.status in ("Resolved", "Closed") and not self.resolved_on:
                self.resolved_on = now_datetime()
            if self.status not in CLOSED_STATES:
                self.resolved_on = None
            self.log_update(_("Status changed to {0}").format(self.status), visible=True)
        elif not before:
            self.log_update(_("Request opened"), visible=True)

    def log_update(self, note, visible=False):
        self.append(
            "updates",
            {
                "posted_on": now_datetime(),
                "posted_by": frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user,
                "status": self.status,
                "note": note,
                "visible_to_tenant": 1 if visible else 0,
            },
        )

    def after_insert(self):
        recipients = set()
        manager = frappe.db.get_value("Property", self.property, "manager")
        if manager:
            recipients.add(manager)
        if self.assigned_to:
            recipients.add(self.assigned_to)
        for user in recipients:
            if user == frappe.session.user:
                continue
            frappe.get_doc(
                {
                    "doctype": "Notification Log",
                    "for_user": user,
                    "type": "Alert",
                    "subject": _("New maintenance request: {0}").format(self.subject),
                    "document_type": self.doctype,
                    "document_name": self.name,
                }
            ).insert(ignore_permissions=True)

    def on_update(self):
        before = self.get_doc_before_save()
        if before and before.status != self.status and self.status in ("Resolved", "Closed") and self.customer:
            phones = customer_phones(self.customer)
            send_sms(phones[:1], _("Your maintenance request {0} ({1}) has been marked {2}.").format(self.name, self.subject, self.status))

    @frappe.whitelist()
    def add_note(self, note, visible_to_tenant=0):
        self.check_permission("write")
        self.log_update(note, visible=bool(cint(visible_to_tenant)))
        self.save()
        return True

    @frappe.whitelist()
    def make_recharge_invoice(self):
        self.check_permission("write")
        if self.charge_invoice:
            frappe.throw(_("Already invoiced: {0}").format(self.charge_invoice))
        if not self.customer or flt(self.actual_cost) <= 0:
            frappe.throw(_("Enter the actual cost and make sure a tenant is set."))
        settings = get_settings()
        if not settings.maintenance_charge_item:
            frappe.throw(_("Set the Maintenance Recharge Item in Property Settings."))
        invoice = frappe.new_doc("Sales Invoice")
        invoice.customer = self.customer
        invoice.company = frappe.db.get_value("Property", self.property, "company")
        invoice.lease = self.lease
        invoice.property = self.property
        invoice.is_lease_invoice = 1 if self.lease else 0
        billing.prepare_invoice(invoice)
        invoice.due_date = add_days(nowdate(), cint((self.lease and frappe.db.get_value("Lease Agreement", self.lease, "payment_terms_days")) or 14))
        invoice.append(
            "items",
            {
                "item_code": settings.maintenance_charge_item,
                "description": _("Maintenance recharge {0}: {1}").format(self.name, self.subject),
                "qty": 1,
                "rate": flt(self.actual_cost, 2),
            },
        )
        if settings.tax_template:
            invoice.taxes_and_charges = settings.tax_template
            invoice.set_taxes()
        invoice.insert(ignore_permissions=True)
        invoice.submit()
        self.db_set("charge_invoice", invoice.name)
        if self.lease:
            billing.refresh_lease_totals(self.lease)
        return invoice.name
