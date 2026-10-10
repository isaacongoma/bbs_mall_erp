import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, add_months, cint, date_diff, flt, getdate, now_datetime, nowdate

from apps.bbs_property.property_management import billing
from apps.bbs_property.property_management.utils import ACTIVE_LEASE_STATUSES, get_settings


class LeaseAgreement(Document):
    doctype = "Lease Agreement"

    def validate(self):
        self.validate_dates()
        self.validate_units()
        self.apply_terms_template()
        self.calculate_totals()
        if self.docstatus == 0:
            billing.build_rent_schedule(self)
            self.set_first_billing_date()

    def validate_dates(self):
        if getdate(self.end_date) <= getdate(self.start_date):
            frappe.throw(_("Lease end date must be after the start date."))
        self.lease_term_months = max(1, round(date_diff(self.end_date, self.start_date) / 30.4375))
        self.rent_start_date = add_months(getdate(self.start_date), cint(self.rent_free_months))
        if getdate(self.rent_start_date) > getdate(self.end_date):
            frappe.throw(_("Rent-free months cannot exceed the lease term."))

    def validate_units(self):
        if not self.units:
            frappe.throw(_("Add at least one unit to the lease."))
        seen = set()
        for row in self.units:
            if row.unit in seen:
                frappe.throw(_("Unit {0} is listed twice.").format(row.unit))
            seen.add(row.unit)
            unit = frappe.db.get_value(
                "Rentable Unit", row.unit, ["property", "status", "base_rent", "service_charge", "area_sqm", "unit_type"], as_dict=True
            )
            row.area_sqm = unit.area_sqm
            row.unit_type = unit.unit_type
            if unit.property != self.property:
                frappe.throw(_("Unit {0} belongs to {1}, not {2}.").format(row.unit, unit.property, self.property))
            if not flt(row.monthly_rent) and flt(unit.base_rent):
                row.monthly_rent = unit.base_rent
            if not flt(row.monthly_service_charge) and flt(unit.service_charge):
                row.monthly_service_charge = unit.service_charge
            clash = frappe.db.sql(
                """
                select l.name from "tabLease Agreement" l
                join "tabLease Unit" u on u.parent = l.name
                where u.unit = %s and l.docstatus = 1 and l.name != %s
                  and l.status in ('Active', 'Expiring Soon')
                  and l.start_date <= %s and coalesce(l.termination_date, l.end_date) >= %s
                limit 1
                """,
                (row.unit, self.name or "", self.end_date, self.start_date),
            )
            if clash:
                frappe.throw(_("Unit {0} is already leased under {1} for these dates.").format(row.unit, clash[0][0]))

    def apply_terms_template(self):
        if self.terms_template and not self.terms:
            self.terms = frappe.db.get_value("Terms and Conditions", self.terms_template, "terms")

    def calculate_totals(self):
        self.total_area = sum(flt(row.area_sqm) for row in self.units)
        self.total_monthly_rent = sum(flt(row.monthly_rent) for row in self.units)
        self.total_monthly_service_charge = sum(flt(row.monthly_service_charge) for row in self.units)
        if cint(self.turnover_rent_applicable) and not flt(self.turnover_rent_percent):
            frappe.throw(_("Enter the turnover rent percentage."))

    def set_first_billing_date(self):
        self.next_billing_date = self.rent_start_date if getdate(self.rent_start_date) <= getdate(self.end_date) else None
        self.last_billed_to = None

    def onload(self):
        self.set_onload("next_period", billing.next_period(self))
        self.set_onload("deposit_gap", flt(self.security_deposit_amount) - flt(self.deposit_received))

    def before_submit(self):
        if not self.rent_schedule:
            billing.build_rent_schedule(self)
        if cint(self.security_deposit_amount) and not frappe.db.get_value("Property", self.property, "security_deposit_account"):
            frappe.msgprint(
                _("Set the Security Deposit Liability Account on {0} before recording the deposit.").format(self.property),
                indicator="orange",
            )

    def on_submit(self):
        self.db_set("status", self.computed_status(), update_modified=False)
        sync_units(self)
        refresh_after_change(self)

    def on_update_after_submit(self):
        sync_units(self)

    def on_cancel(self):
        self.db_set("status", "Cancelled", update_modified=False)
        sync_units(self)
        refresh_after_change(self)

    def computed_status(self):
        today = getdate(nowdate())
        if self.status in ("Terminated", "Renewed", "Cancelled"):
            return self.status
        if getdate(self.end_date) < today:
            return "Expired"
        alert = cint(get_settings().lease_expiry_alert_days)
        if alert and getdate(self.end_date) <= add_days(today, alert):
            return "Expiring Soon"
        return "Active"

    @frappe.whitelist()
    def make_next_invoice(self):
        self.check_permission("write")
        period = billing.next_period(self)
        if not period:
            frappe.throw(_("There is nothing left to bill on this lease."))
        invoice = billing.make_lease_invoice(self, period[0], period[1], posting_date=nowdate())
        if not invoice:
            frappe.throw(_("An invoice for this period already exists."))
        return invoice.name

    @frappe.whitelist()
    def terminate(self, termination_date, termination_type, reason=None):
        self.check_permission("write")
        if self.docstatus != 1:
            frappe.throw(_("Only submitted leases can be terminated."))
        date = getdate(termination_date)
        if date < getdate(self.start_date):
            frappe.throw(_("Termination cannot be before the lease start."))
        self.db_set(
            {
                "termination_date": date,
                "termination_type": termination_type,
                "termination_reason": reason,
                "status": "Terminated" if date <= getdate(nowdate()) else self.status,
            }
        )
        if date <= getdate(self.end_date) and billing.next_period(frappe.get_doc("Lease Agreement", self.name)) is None:
            self.db_set("next_billing_date", None)
        sync_units(frappe.get_doc("Lease Agreement", self.name))
        refresh_after_change(self)
        return self.status

    @frappe.whitelist()
    def make_renewal(self, months=None):
        self.check_permission("read")
        term = cint(months) or cint(self.lease_term_months) or 12
        new = frappe.new_doc("Lease Agreement")
        for field in (
            "customer",
            "trading_name",
            "property",
            "billing_frequency",
            "billing_day",
            "payment_terms_days",
            "auto_invoice",
            "tax_template",
            "escalation_type",
            "escalation_rate",
            "escalation_amount",
            "escalation_months",
            "turnover_rent_applicable",
            "turnover_rent_percent",
            "security_deposit_amount",
            "terms_template",
            "terms",
            "notice_period_days",
            "auto_renew",
        ):
            new.set(field, self.get(field))
        new.lease_type = "Renewal"
        new.renewal_of = self.name
        new.start_date = add_days(getdate(self.end_date), 1)
        new.end_date = add_days(add_months(new.start_date, term), -1)
        factor, bump = billing.escalation_factor(self, new.start_date)
        for row in self.units:
            monthly = flt(row.monthly_rent) * factor + bump
            new.append("units", {"unit": row.unit, "monthly_rent": flt(monthly, 2), "monthly_service_charge": row.monthly_service_charge})
        for charge in self.charges:
            if charge.frequency != "One-off":
                new.append("charges", {"charge_item": charge.charge_item, "description": charge.description, "amount": charge.amount, "frequency": charge.frequency, "escalates": charge.escalates})
        return new.as_dict()

    @frappe.whitelist()
    def sign(self, party, signature, signatory_name=None):
        if party == "Landlord":
            self.check_permission("write")
            self.db_set(
                {
                    "landlord_signature": signature,
                    "landlord_signed_on": now_datetime(),
                    "landlord_signatory": signatory_name or frappe.session.user,
                }
            )
        elif party == "Tenant":
            self.db_set(
                {
                    "tenant_signature": signature,
                    "tenant_signed_on": now_datetime(),
                    "tenant_signatory_name": signatory_name or self.tenant_name,
                }
            )
        else:
            frappe.throw(_("Unknown signing party."))
        return True


def sync_units(lease):
    today = getdate(nowdate())
    for row in lease.units:
        values = {}
        active = (
            lease.docstatus == 1
            and lease.status in ACTIVE_LEASE_STATUSES
            and getdate(lease.end_date) >= today
            and not (lease.termination_date and getdate(lease.termination_date) < today)
        )
        if active and getdate(lease.start_date) <= today:
            values = {
                "status": "Occupied",
                "current_lease": lease.name,
                "current_tenant": lease.customer,
                "lease_expiry": lease.termination_date or lease.end_date,
                "vacant_since": None,
            }
        elif active:
            current = frappe.db.get_value("Rentable Unit", row.unit, "status")
            if current in ("Vacant", "Reserved"):
                values = {"status": "Reserved", "current_lease": lease.name, "current_tenant": lease.customer, "lease_expiry": lease.end_date}
        else:
            holder = frappe.db.get_value("Rentable Unit", row.unit, "current_lease")
            if holder == lease.name:
                values = {"status": "Vacant", "current_lease": None, "current_tenant": None, "lease_expiry": None, "vacant_since": today}
        if values:
            frappe.db.set_value("Rentable Unit", row.unit, values, update_modified=False)
    refresh_metrics(lease.property)


def refresh_metrics(property_name):
    from apps.bbs_property.property_management.doctype.property.property import refresh_property_metrics

    refresh_property_metrics(property_name)


def refresh_after_change(lease):
    billing.refresh_lease_totals(lease.name)
