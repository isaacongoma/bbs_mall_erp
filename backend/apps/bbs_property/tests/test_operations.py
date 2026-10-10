import json

import frappe
from frappe.utils import add_days, add_months, flt, getdate, nowdate

from apps.bbs_property.property_management import billing, mpesa, portal
from apps.bbs_property.tests.base import PropertyTestCase


class TestOperations(PropertyTestCase):
    def make_tariff(self, name="Test Power", rate=20):
        if frappe.db.exists("Utility Tariff", name):
            return name
        return frappe.get_doc(
            {"doctype": "Utility Tariff", "tariff_name": name, "utility_type": "Electricity", "uom": "kWh", "item": "Electricity", "rate_per_unit": rate, "fixed_charge": 100}
        ).insert().name

    def make_meter(self, unit, number="MTR-1"):
        return frappe.get_doc(
            {"doctype": "Utility Meter", "meter_number": number, "utility_type": "Electricity", "property": self.property, "unit": unit, "tariff": self.make_tariff(), "initial_reading": 1000}
        ).insert().name

    def test_meter_reading_is_billed_with_rent(self):
        unit = self.make_unit("M01", rent=100000, service=0)
        lease = self.make_lease([unit])
        meter = self.make_meter(unit)
        reading = frappe.get_doc({"doctype": "Meter Reading", "meter": meter, "current_reading": 1100, "reading_date": nowdate()}).insert()
        self.assertEqual(flt(reading.consumption), 100)
        self.assertEqual(flt(reading.amount), 2100)
        self.assertEqual(reading.lease, lease.name)
        with self.assertRaises(frappe.ValidationError):
            frappe.get_doc({"doctype": "Meter Reading", "meter": meter, "current_reading": 900, "reading_date": nowdate()}).insert()
        invoice = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1))
        self.assertEqual(flt(invoice.grand_total), 102100)
        reading.reload()
        self.assertEqual(reading.status, "Billed")
        self.assertEqual(reading.sales_invoice, invoice.name)

    def test_tenant_reading_waits_for_approval(self):
        unit = self.make_unit("M02")
        self.make_lease([unit])
        meter = self.make_meter(unit, "MTR-2")
        reading = frappe.get_doc({"doctype": "Meter Reading", "meter": meter, "current_reading": 1050, "reading_date": nowdate(), "source": "Tenant Portal"}).insert()
        self.assertEqual(reading.status, "Pending Approval")
        self.assertEqual(flt(frappe.db.get_value("Utility Meter", meter, "last_reading")), 1000)
        reading.approve()
        self.assertEqual(flt(frappe.db.get_value("Utility Meter", meter, "last_reading")), 1050)

    def test_turnover_rent_is_computed_and_billed(self):
        unit = self.make_unit("T01", rent=100000, service=0)
        lease = self.make_lease([unit], turnover_rent_applicable=1, turnover_rent_percent=10)
        declaration = frappe.get_doc(
            {
                "doctype": "Tenant Sales Declaration",
                "lease": lease.name,
                "period_start": add_days(nowdate(), -30),
                "period_end": nowdate(),
                "gross_sales": 2000000,
            }
        ).insert()
        self.assertGreater(flt(declaration.turnover_rent_due), 0)
        declaration.approve()
        invoice = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1))
        self.assertGreater(flt(invoice.grand_total), 100000)
        declaration.reload()
        self.assertEqual(declaration.status, "Billed")

    def test_maintenance_sla_and_recharge(self):
        unit = self.make_unit("MN1")
        lease = self.make_lease([unit])
        request = frappe.get_doc({"doctype": "Maintenance Request", "subject": "Leak", "property": self.property, "unit": unit, "priority": "Urgent", "category": "Plumbing"}).insert()
        self.assertEqual(request.customer, lease.customer)
        self.assertTrue(request.due_by)
        request.status = "Resolved"
        request.actual_cost = 5000
        request.chargeable_to_tenant = 1
        request.save()
        self.assertTrue(request.resolved_on)
        name = request.make_recharge_invoice()
        self.assertEqual(flt(frappe.db.get_value("Sales Invoice", name, "grand_total")), 5000)

    def test_notice_audience(self):
        unit = self.make_unit("NT1")
        lease = self.make_lease([unit])
        notice = frappe.get_doc({"doctype": "Tenant Notice", "title": "Water cut", "message": "<p>Tomorrow</p>", "audience": "All Tenants"}).insert()
        self.assertEqual(notice.publish(), 1)
        rows = portal.notices_for(lease.customer)
        self.assertEqual([row.title for row in rows], ["Water cut"])

    def test_enquiry_to_lease(self):
        unit = self.make_unit("EN1", rent=80000)
        enquiry = frappe.get_doc({"doctype": "Space Enquiry", "prospect_name": "Fresh Bakers", "property": self.property, "unit": unit, "contact_phone": "0712345678"}).insert()
        values = enquiry.make_lease()
        self.assertEqual(values["units"][0]["unit"], unit)
        self.assertEqual(frappe.db.get_value("Space Enquiry", enquiry.name, "status"), "Won")
        self.assertTrue(frappe.db.exists("Customer", values["customer"]))


class TestMpesaAndPortal(PropertyTestCase):
    def setUp(self):
        super().setUp()
        settings = frappe.get_single("Property Settings")
        settings.mpesa_mode_of_payment = "Cash"
        settings.mpesa_clearing_account = "_Test Bank - _TC"
        settings.save()

    def invoice_for(self, code="P01", rent=60000):
        unit = self.make_unit(code, rent=rent, service=0)
        lease = self.make_lease([unit])
        invoice = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1))
        return lease, invoice

    def test_c2b_payment_allocates_to_invoice(self):
        lease, invoice = self.invoice_for()
        payload = {"TransID": "QWE123", "TransAmount": "60000", "MSISDN": "254700000000", "BillRefNumber": lease.customer, "TransTime": "20261010120000", "FirstName": "Jane"}
        mpesa.handle_c2b(payload)
        row = frappe.get_doc("Mpesa Payment", {"transaction_id": "QWE123"})
        self.assertEqual(row.status, "Allocated")
        self.assertTrue(row.payment_entry)
        self.assertEqual(flt(frappe.db.get_value("Sales Invoice", invoice.name, "outstanding_amount")), 0)
        mpesa.handle_c2b(payload)
        self.assertEqual(frappe.db.count("Mpesa Payment", {"transaction_id": "QWE123"}), 1)

    def test_unknown_reference_is_left_unmatched(self):
        mpesa.handle_c2b({"TransID": "ZZZ999", "TransAmount": "100", "MSISDN": "254711111111", "BillRefNumber": "NOBODY-HERE", "TransTime": "20261010120000"})
        self.assertEqual(frappe.db.get_value("Mpesa Payment", {"transaction_id": "ZZZ999"}, "status"), "Unmatched")

    def test_stk_callback_success_and_failure(self):
        lease, invoice = self.invoice_for("P02", 30000)
        ok = frappe.get_doc({"doctype": "Mpesa Payment", "source": "STK Push", "status": "Pending", "amount": 30000, "phone": "254700000000", "customer": lease.customer, "checkout_request_id": "ws_CO_1", "sales_invoice": invoice.name}).insert()
        mpesa.handle_stk_callback(
            {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_1", "ResultCode": 0, "ResultDesc": "ok", "CallbackMetadata": {"Item": [{"Name": "Amount", "Value": 30000}, {"Name": "MpesaReceiptNumber", "Value": "RCP1"}, {"Name": "TransactionDate", "Value": 20261010120000}, {"Name": "PhoneNumber", "Value": 254700000000}]}}}}
        )
        ok.reload()
        self.assertEqual(ok.status, "Allocated")
        failed = frappe.get_doc({"doctype": "Mpesa Payment", "source": "STK Push", "status": "Pending", "amount": 10, "customer": lease.customer, "checkout_request_id": "ws_CO_2"}).insert()
        mpesa.handle_stk_callback({"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_2", "ResultCode": 1032, "ResultDesc": "Cancelled"}}})
        failed.reload()
        self.assertEqual(failed.status, "Cancelled")

    def test_portal_is_scoped_to_the_signed_in_tenant(self):
        mine, my_invoice = self.invoice_for("P03", 20000)
        other_customer = self.make_customer("_Test Tenant Other")
        other = self.make_lease([self.make_unit("P04", rent=15000, service=0)], customer=other_customer)
        other_invoice = billing.make_lease_invoice(other, other.start_date, add_days(add_months(getdate(other.start_date), 1), -1))
        user = portal.portal_user("portal.tenant@example.com", "Portal Tenant", "0722000111")
        customer = frappe.get_doc("Customer", mine.customer)
        customer.append("tenant_portal_users", {"user": user.name, "access_level": "Owner"})
        customer.save()
        frappe.set_user(user.name)
        try:
            context = portal.get_context()
            self.assertEqual([row["customer"] for row in context["tenants"]], [mine.customer])
            dashboard = portal.get_dashboard()
            self.assertEqual(flt(dashboard["balance"]["outstanding"]), 20000)
            self.assertEqual(portal.get_invoices()["total"], 1)
            self.assertEqual(portal.get_invoice(my_invoice.name)["name"], my_invoice.name)
            with self.assertRaises(frappe.DoesNotExistError):
                portal.get_invoice(other_invoice.name)
            with self.assertRaises(frappe.PermissionError):
                portal.get_dashboard(other.customer)
            statement = portal.get_statement()
            self.assertEqual(flt(statement["closing"]), 20000)
            created = portal.create_maintenance_request("Light out", mine.units[0].unit, "Electrical", "High", "Corridor light")
            self.assertTrue(frappe.db.exists("Maintenance Request", created))
            self.assertEqual(len(portal.get_maintenance()), 1)
        finally:
            frappe.set_user("Administrator")

    def test_operations_level_cannot_see_finance(self):
        mine, _invoice = self.invoice_for("P05", 20000)
        user = portal.portal_user("ops.tenant@example.com", "Ops Tenant", "0722000222")
        customer = frappe.get_doc("Customer", mine.customer)
        customer.append("tenant_portal_users", {"user": user.name, "access_level": "Operations"})
        customer.save()
        frappe.set_user(user.name)
        try:
            with self.assertRaises(frappe.PermissionError):
                portal.get_invoices()
            self.assertIn("open_requests", portal.get_dashboard())
            self.assertNotIn("recent_invoices", portal.get_dashboard())
        finally:
            frappe.set_user("Administrator")
