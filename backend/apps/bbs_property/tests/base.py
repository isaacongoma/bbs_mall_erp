import frappe
from frappe.utils import add_days, add_months, getdate, nowdate

from apps.bbs_property import setup
from erpnext.tests.utils import ERPNextTestSuite

COMPANY = "_Test Company"


class PropertyTestCase(ERPNextTestSuite):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        setup.after_install()

    def setUp(self):
        super().setUp()
        self.company = COMPANY
        self.deposit_account = self.ensure_account("Tenant Deposits", "Current Liabilities - _TC")
        self.income_account = "Sales - _TC"
        settings = frappe.get_single("Property Settings")
        settings.default_company = self.company
        settings.grace_period_days = 5
        settings.enable_late_fees = 1
        settings.late_fee_percent = 10
        settings.maximum_late_fee_percent = 50
        settings.submit_invoices_automatically = 1
        settings.save()
        self.property = self.make_property()

    def ensure_account(self, name, parent, account_type=None):
        full = f"{name} - _TC"
        if not frappe.db.exists("Account", full):
            frappe.get_doc(
                {
                    "doctype": "Account",
                    "account_name": name,
                    "parent_account": parent,
                    "company": self.company,
                    "account_type": account_type,
                    "root_type": "Liability",
                    "is_group": 0,
                }
            ).insert()
        return full

    def make_property(self, name="Test Mall", abbr="TM"):
        if frappe.db.exists("Property", name):
            return name
        doc = frappe.get_doc(
            {
                "doctype": "Property",
                "property_name": name,
                "abbr": abbr,
                "company": self.company,
                "security_deposit_account": self.deposit_account,
                "rent_income_account": self.income_account,
            }
        )
        doc.insert()
        return doc.name

    def make_floor(self, level=0, name="Ground Floor"):
        key = f"{self.property}-{name}"
        if frappe.db.exists("Property Floor", key):
            return key
        return frappe.get_doc({"doctype": "Property Floor", "property": self.property, "floor_name": name, "level": level}).insert().name

    def make_unit(self, code="G01", area=50, rent=100000, service=10000):
        doc = frappe.get_doc(
            {
                "doctype": "Rentable Unit",
                "property": self.property,
                "floor": self.make_floor(),
                "unit_code": code,
                "area_sqm": area,
                "base_rent": rent,
                "service_charge": service,
            }
        )
        doc.insert()
        return doc.name

    def make_customer(self, name="_Test Tenant"):
        existing = frappe.db.get_value("Customer", {"customer_name": name})
        if existing:
            return existing
        doc = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": name,
                "customer_group": "_Test Customer Group",
                "territory": "_Test Territory",
                "customer_type": "Company",
                "is_tenant": 1,
            }
        )
        doc.insert()
        return doc.name

    def make_lease(self, units=None, customer=None, start=None, months=12, submit=True, **values):
        units = units or [self.make_unit()]
        start = getdate(start or add_days(nowdate(), -5))
        doc = frappe.get_doc(
            {
                "doctype": "Lease Agreement",
                "customer": customer or self.make_customer(),
                "property": self.property,
                "start_date": start,
                "end_date": add_days(add_months(start, months), -1),
                "billing_frequency": "Monthly",
                "payment_terms_days": 7,
                "units": [{"unit": unit} for unit in units],
                **values,
            }
        )
        doc.insert()
        if submit:
            doc.submit()
        return doc
