import json
import random

import frappe
from django.core.management.base import BaseCommand
from django.db import transaction
from frappe.utils import add_days, add_months, getdate, nowdate

from apps.bbs_property.property_management import billing, portal
from apps.bbs_property.property_management.utils import get_settings

MARKER = "property_demo_seed"
DEMO_PASSWORD = "DemoPass123!"
DEMO_EMAIL = "tenant@bbsmall.demo"

FLOORS = [("Ground Floor", 0), ("First Floor", 1), ("Second Floor", 2)]
UNITS = [
    ("G01", 0, "Anchor Store", 420, 1450, "Supermarket"),
    ("G02", 0, "Retail Shop", 62, 2800, "Fashion"),
    ("G03", 0, "Retail Shop", 48, 3000, "Electronics"),
    ("G04", 0, "Kiosk", 9, 5200, "Services"),
    ("G05", 0, "Restaurant", 110, 2400, "Food and Beverage"),
    ("G06", 0, "Retail Shop", 55, 2900, "Health and Beauty"),
    ("F01", 1, "Retail Shop", 70, 2100, "Fashion"),
    ("F02", 1, "Retail Shop", 45, 2200, "Home and Living"),
    ("F03", 1, "Food Court Stall", 24, 3600, "Food and Beverage"),
    ("F04", 1, "Food Court Stall", 24, 3600, "Food and Beverage"),
    ("F05", 1, "Retail Shop", 80, 2000, "Electronics"),
    ("F06", 1, "Office", 60, 1500, "Services"),
    ("S01", 2, "Office", 120, 1300, "Services"),
    ("S02", 2, "Office", 95, 1300, "Banking"),
    ("S03", 2, "Retail Shop", 150, 1700, "Entertainment"),
    ("S04", 2, "Storage", 40, 800, "Other"),
]
TENANTS = [
    ("Naivas Supermarket Ltd", "G01", 14, "Percentage", 6, 12),
    ("Zawadi Fashion House", "G02", 11, "Percentage", 5, 12),
    ("Digital Hub Electronics", "G03", 9, "Percentage", 5, 12),
    ("Mama Pesa Airtime Kiosk", "G04", 7, "None", 0, 12),
    ("Java Corner Cafe", "G05", 13, "Percentage", 7, 12),
    ("Glow Beauty Spa", "G06", 6, "Fixed Amount", 5000, 12),
    ("Urban Threads", "F01", 10, "Percentage", 5, 12),
    ("Chicken Palace Kenya", "F03", 8, "Percentage", 5, 12),
    ("Kenya Commercial Insurance", "S01", 12, "Percentage", 6, 12),
]


def track(created, doctype, name):
    created.append([doctype, name])


class Command(BaseCommand):
    help = "Create (or with --clear remove) demonstration data for Property Management"

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true")

    def handle(self, *args, **options):
        previous = frappe.session.user
        frappe.session.user = "Administrator"
        try:
            with transaction.atomic():
                if options["clear"]:
                    self.clear()
                else:
                    self.seed()
        finally:
            frappe.session.user = previous

    def clear(self):
        raw = frappe.db.get_global(MARKER)
        created = json.loads(raw) if raw else []
        for doctype, name in reversed(created):
            if not frappe.db.exists(doctype, name):
                continue
            try:
                doc = frappe.get_doc(doctype, name)
                if doc.docstatus == 1:
                    doc.cancel()
                frappe.delete_doc(doctype, name, force=1, ignore_permissions=True)
            except Exception as error:
                self.stderr.write(f"could not remove {doctype} {name}: {error}")
        frappe.db.set_global(MARKER, "[]")
        self.stdout.write("demo data removed")

    def seed(self):
        if frappe.db.exists("Property", "BBS Mall"):
            self.stdout.write("demo data already present")
            return
        random.seed(7)
        created = []
        settings = get_settings()
        company = settings.default_company or frappe.defaults.get_global_default("company")
        abbr = frappe.db.get_value("Company", company, "abbr")
        parent = frappe.db.get_value("Account", {"company": company, "account_name": "Current Liabilities"})
        deposit = f"Tenant Security Deposits - {abbr}"
        if not frappe.db.exists("Account", deposit) and parent:
            frappe.get_doc({"doctype": "Account", "account_name": "Tenant Security Deposits", "parent_account": parent, "company": company, "root_type": "Liability", "is_group": 0}).insert()
            track(created, "Account", deposit)
        prop = frappe.get_doc({"doctype": "Property", "property_name": "BBS Mall", "abbr": "BBS", "company": company, "city": "Nairobi", "county": "Nairobi", "gross_leasable_area": 4800, "security_deposit_account": deposit if frappe.db.exists("Account", deposit) else None, "manager": "Administrator", "contact_phone": "0700000000", "contact_email": "mall@bbsmall.co.ke"}).insert()
        track(created, "Property", prop.name)
        floors = {}
        for label, level in FLOORS:
            floor = frappe.get_doc({"doctype": "Property Floor", "property": prop.name, "floor_name": label, "level": level}).insert()
            floors[level] = floor.name
            track(created, "Property Floor", floor.name)
        units = {}
        for code, level, kind, area, rate, category in UNITS:
            unit = frappe.get_doc({"doctype": "Rentable Unit", "property": prop.name, "floor": floors[level], "unit_code": code, "unit_type": kind, "area_sqm": area, "rate_per_sqm": rate, "service_charge_per_sqm": 180, "category": category, "unit_name": code}).insert()
            units[code] = unit.name
            track(created, "Rentable Unit", unit.name)
        tariffs = {}
        for name, kind, uom, item, rate, fixed in (("Commercial Power", "Electricity", "kWh", "Electricity", 24, 350), ("Commercial Water", "Water", "m3", "Water", 130, 200)):
            tariff = frappe.get_doc({"doctype": "Utility Tariff", "tariff_name": name, "utility_type": kind, "uom": uom, "item": item, "rate_per_unit": rate, "fixed_charge": fixed}).insert()
            tariffs[kind] = tariff.name
            track(created, "Utility Tariff", tariff.name)
        today = getdate(nowdate())
        fiscal_start = getdate(frappe.db.sql('select max(year_start_date) from "tabFiscal Year" where year_start_date <= %s and disabled = 0', (today,))[0][0])
        available_months = (today.year - fiscal_start.year) * 12 + today.month - fiscal_start.month
        leases = []
        for index, (name, code, months_ago, escalation, esc_value, term) in enumerate(TENANTS):
            customer = frappe.get_doc({"doctype": "Customer", "customer_name": name, "customer_type": "Company", "customer_group": frappe.db.get_single_value("Selling Settings", "customer_group") or "Commercial", "territory": frappe.db.get_single_value("Selling Settings", "territory") or "All Territories", "is_tenant": 1, "mobile_no": f"07{random.randint(10, 29)}{random.randint(100000, 999999)}"}).insert()
            track(created, "Customer", customer.name)
            months_ago = max(1, min(months_ago, available_months))
            start = add_months(today.replace(day=1), -months_ago)
            lease = frappe.get_doc(
                {
                    "doctype": "Lease Agreement",
                    "customer": customer.name,
                    "property": prop.name,
                    "trading_name": name,
                    "start_date": start,
                    "end_date": add_days(add_months(start, 36 if index % 3 else 24), -1),
                    "units": [{"unit": units[code]}],
                    "billing_frequency": "Monthly",
                    "escalation_type": escalation,
                    "escalation_rate": esc_value if escalation == "Percentage" else 0,
                    "escalation_amount": esc_value if escalation == "Fixed Amount" else 0,
                    "escalation_months": 12,
                    "security_deposit_amount": 0,
                    "turnover_rent_applicable": 1 if index in (0, 4, 7) else 0,
                    "turnover_rent_percent": 8 if index in (0, 4, 7) else 0,
                    "auto_invoice": 1,
                    "payment_terms_days": 7,
                    "rent_free_months": 1 if index == 5 else 0,
                    "charges": [{"charge_item": "Parking", "description": "Reserved parking bays", "amount": 6000, "frequency": "Monthly"}] if index % 2 == 0 else [],
                }
            ).insert()
            lease.security_deposit_amount = lease.total_monthly_rent * 2
            lease.save()
            lease.submit()
            track(created, "Lease Agreement", lease.name)
            leases.append((lease, months_ago))
        for lease, months_ago in leases:
            for kind in ("Electricity", "Water"):
                unit = lease.units[0].unit
                meter = frappe.get_doc({"doctype": "Utility Meter", "meter_number": f"{kind[:1]}M-{unit}", "utility_type": kind, "property": prop.name, "unit": unit, "tariff": tariffs[kind], "initial_reading": 100}).insert()
                track(created, "Utility Meter", meter.name)
                reading = 100.0
                for step in range(max(1, min(months_ago, 6)), 0, -1):
                    reading += random.randint(180, 520) if kind == "Electricity" else random.randint(12, 60)
                    entry = frappe.get_doc({"doctype": "Meter Reading", "meter": meter.name, "current_reading": reading, "reading_date": add_months(today, -step + 1) if step > 1 else add_days(today, -3), "status": "Approved"}).insert()
                    track(created, "Meter Reading", entry.name)
        self.stdout.write("billing history ...")
        from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

        bank = frappe.db.get_value("Account", {"company": company, "account_type": "Bank", "is_group": 0}) or frappe.db.get_value("Account", {"company": company, "account_type": "Cash", "is_group": 0})
        for position, (lease, _months) in enumerate(leases):
            lease = frappe.get_doc("Lease Agreement", lease.name)
            invoices = []
            while True:
                period = billing.next_period(lease)
                if not period or period[0] > today:
                    break
                invoice = billing.make_lease_invoice(lease, period[0], period[1], posting_date=period[0])
                if invoice is None:
                    break
                invoices.append(invoice)
                track(created, "Sales Invoice", invoice.name)
                lease = frappe.get_doc("Lease Agreement", lease.name)
            unpaid = 1 if position % 3 == 0 else (2 if position % 4 == 1 else 0)
            for invoice in invoices[: len(invoices) - unpaid]:
                entry = get_payment_entry("Sales Invoice", invoice.name, bank_account=bank)
                entry.reference_no = f"DEMO-{invoice.name}"
                entry.reference_date = invoice.due_date
                entry.posting_date = min(getdate(invoice.due_date), today)
                entry.insert()
                entry.submit()
                track(created, "Payment Entry", entry.name)
            billing.refresh_lease_totals(lease.name)
            if bank and deposit:
                dep = frappe.get_doc({"doctype": "Lease Deposit", "lease": lease.name, "transaction_type": "Receipt", "amount": lease.security_deposit_amount, "bank_account": bank, "posting_date": lease.start_date}).insert()
                dep.submit()
                track(created, "Lease Deposit", dep.name)
        for subject, category, priority, unit in (
            ("Ceiling leak above entrance", "Plumbing", "Urgent", "G05"),
            ("Flickering lights in display area", "Electrical", "Medium", "G02"),
            ("Air conditioning not cooling", "HVAC", "High", "F01"),
            ("Signage lamp replacement", "Signage", "Low", "G03"),
        ):
            request = frappe.get_doc({"doctype": "Maintenance Request", "subject": subject, "property": prop.name, "unit": units[unit], "category": category, "priority": priority, "source": "Tenant Portal"}).insert()
            track(created, "Maintenance Request", request.name)
        notice = frappe.get_doc({"doctype": "Tenant Notice", "title": "Scheduled water maintenance", "priority": "Important", "audience": "All Tenants", "message": "<p>Water supply will be interrupted on Sunday from 6am to 10am for tank cleaning. Please plan accordingly.</p>"}).insert()
        notice.publish()
        track(created, "Tenant Notice", notice.name)
        enquiry = frappe.get_doc({"doctype": "Space Enquiry", "prospect_name": "Fresh Bakers Ltd", "business_type": "Bakery", "property": prop.name, "unit": units["F02"], "contact_phone": "0733000111", "required_area_sqm": 45, "budget_per_month": 100000}).insert()
        track(created, "Space Enquiry", enquiry.name)
        first = leases[0][0]
        user = portal.portal_user(DEMO_EMAIL, "Demo Tenant", "0799000111")
        track(created, "User", user.name)
        from apps.core.models import User

        django_user = User.objects.get(email=DEMO_EMAIL)
        django_user.set_password(DEMO_PASSWORD)
        django_user.save()
        customer = frappe.get_doc("Customer", first.customer)
        customer.append("tenant_portal_users", {"user": user.name, "access_level": "Owner"})
        customer.save()
        self.stdout.write(f"demo tenant login: {DEMO_EMAIL} / {DEMO_PASSWORD}  ({customer.customer_name})")
        frappe.db.set_global(MARKER, json.dumps(created))
        self.stdout.write(f"created {len(created)} records")
