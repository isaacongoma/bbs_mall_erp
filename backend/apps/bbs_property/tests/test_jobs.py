from unittest import mock

import frappe
from frappe.utils import add_days, add_months, flt, getdate, nowdate

from apps.bbs_property.property_management import billing, lease_jobs, mpesa
from apps.bbs_property.tests.base import PropertyTestCase


class TestJobs(PropertyTestCase):
    def test_daily_invoicing_creates_due_invoices_once(self):
        unit = self.make_unit("J01", rent=40000, service=0)
        lease = self.make_lease([unit], start=add_days(nowdate(), -2))
        self.assertGreaterEqual(lease_jobs.generate_due_invoices(), 1)
        self.assertEqual(lease_jobs.generate_due_invoices(), 0)
        self.assertEqual(frappe.db.count("Sales Invoice", {"lease": lease.name, "docstatus": 1}), 1)

    def test_status_job_marks_expiring_and_expired(self):
        near = self.make_lease([self.make_unit("J02")], start=add_months(nowdate(), -11), months=12)
        lease_jobs.update_lease_statuses()
        self.assertEqual(frappe.db.get_value("Lease Agreement", near.name, "status"), "Expiring Soon")
        frappe.db.set_value("Lease Agreement", near.name, "end_date", add_days(nowdate(), -1))
        lease_jobs.update_lease_statuses()
        self.assertEqual(frappe.db.get_value("Lease Agreement", near.name, "status"), "Expired")
        self.assertEqual(frappe.db.get_value("Rentable Unit", near.units[0].unit, "status"), "Vacant")

    def test_reminders_use_sms_templates(self):
        unit = self.make_unit("J03", rent=10000, service=0)
        lease = self.make_lease([unit], start=add_days(nowdate(), -20))
        invoice = billing.make_lease_invoice(lease, lease.start_date, add_days(add_months(getdate(lease.start_date), 1), -1), posting_date=add_days(nowdate(), -20))
        frappe.db.set_value("Sales Invoice", invoice.name, "due_date", add_days(nowdate(), -7))
        settings = frappe.get_single("Property Settings")
        settings.send_email_reminders = 0
        settings.send_sms_reminders = 1
        settings.overdue_reminder_every_days = 7
        settings.save()
        with mock.patch.object(lease_jobs, "send_sms") as sender, mock.patch.object(lease_jobs, "customer_phones", return_value=["0712345678"]):
            lease_jobs.send_payment_reminders()
        sender.assert_called_once()
        self.assertIn(invoice.name, sender.call_args[0][1])

    def test_stk_push_records_pending_payment(self):
        lease = self.make_lease([self.make_unit("J04", rent=25000, service=0)])
        settings = frappe.get_single("Property Settings")
        settings.mpesa_consumer_key = "key"
        settings.mpesa_consumer_secret = "secret"
        settings.mpesa_passkey = "passkey"
        settings.mpesa_shortcode = "174379"
        settings.mpesa_paybill = "174379"
        settings.mpesa_callback_url = "https://erp.example.com"
        settings.save()

        class Reply:
            status_code = 200
            content = b"{}"

            def __init__(self, body):
                self.body = body

            def json(self):
                return self.body

            def raise_for_status(self):
                return None

        with mock.patch.object(mpesa.requests, "get", return_value=Reply({"access_token": "tok"})), mock.patch.object(
            mpesa.requests,
            "post",
            return_value=Reply({"ResponseCode": "0", "CheckoutRequestID": "ws_CO_X", "MerchantRequestID": "m1", "CustomerMessage": "Sent"}),
        ) as post:
            result = mpesa.stk_push(lease.customer, "0712345678", 25000, lease=lease.name)
        self.assertEqual(result["checkout_request_id"], "ws_CO_X")
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["PartyA"], "254712345678")
        self.assertTrue(payload["CallBackURL"].startswith("https://erp.example.com/api/property-mgmt/mpesa/"))
        row = frappe.get_doc("Mpesa Payment", result["payment"])
        self.assertEqual((row.status, flt(row.amount)), ("Pending", 25000))
        with self.assertRaises(frappe.ValidationError):
            mpesa.stk_push(lease.customer, "12345", 100)
