import base64
import json
from pathlib import Path

from django.test import TestCase
from rest_framework.test import APIClient

import frappe
from apps.erpnext.erpnext_integrations.mpesa import payments
from apps.erpnext.erpnext_integrations.mpesa.client import DarajaClient, DarajaError
from apps.erpnext.registry import get_model
from apps.frappe.runtime import new_doc, session

FIXTURES = Path(__file__).resolve().parent / "fixtures"
CALLBACK = "/api/erpnext/method/erpnext.erpnext_integrations.mpesa.callbacks.{}/?token=secret-token"


def fixture(name):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


class FakeHttp:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    def __call__(self, method, url, headers=None, json_body=None, auth=None):
        self.calls.append({"method": method, "url": url, "headers": headers, "body": json_body, "auth": auth})
        return self.responses[url.split("safaricom.co.ke")[1].split("?")[0]]


class MpesaTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        company = new_doc("Company")
        company.company_name = "Mpesa Ltd"
        company.abbr = "MPL"
        company.default_currency = "KES"
        company.country = "Kenya"
        company.chart_of_accounts = "Standard"
        company.insert()
        self.company = company.name
        settings = frappe.get_doc("M-Pesa Settings")
        settings.update(
            {
                "enabled": 1,
                "environment": "Sandbox",
                "company": self.company,
                "consumer_key": "key",
                "consumer_secret": "secret",
                "business_shortcode": "600638",
                "passkey": "passkey",
                "initiator_name": "testapi",
                "security_credential": "cred",
                "callback_base_url": "https://erp.example.com",
                "callback_token": "secret-token",
                "receiving_account": "Cash - MPL",
            }
        )
        settings.save()
        self.settings = settings
        customer = new_doc("Customer")
        customer.customer_name = "Mpesa Customer"
        customer.customer_type = "Company"
        customer.insert()
        price_list = new_doc("Price List")
        price_list.price_list_name = "Standard Selling"
        price_list.currency = "KES"
        price_list.selling = 1
        price_list.enabled = 1
        price_list.insert(ignore_if_duplicate=True)
        item = new_doc("Item")
        item.item_code = "MP-SERVICE"
        item.item_name = "Service"
        item.item_group = "All Item Groups"
        item.stock_uom = "Nos"
        item.is_stock_item = 0
        item.insert()
        fiscal_year = new_doc("Fiscal Year")
        fiscal_year.year = "2026"
        fiscal_year.year_start_date = "2026-01-01"
        fiscal_year.year_end_date = "2026-12-31"
        fiscal_year.insert(ignore_if_duplicate=True)
        self.invoice = self.make_invoice()

    def make_invoice(self):
        invoice = new_doc("Sales Invoice")
        invoice.customer = "Mpesa Customer"
        invoice.company = self.company
        invoice.debit_to = "Debtors - MPL"
        invoice.set_posting_time = 1
        invoice.posting_date = "2026-10-03"
        invoice.due_date = "2026-10-31"
        invoice.currency = "KES"
        invoice.selling_price_list = "Standard Selling"
        invoice.price_list_currency = "KES"
        invoice.plc_conversion_rate = 1
        invoice.conversion_rate = 1
        invoice.append("items", {"item_code": "MP-SERVICE", "qty": 1, "rate": 11600, "income_account": "Sales - MPL"})
        invoice.set_missing_values()
        invoice.calculate_taxes_and_totals()
        invoice.insert()
        invoice.submit()
        return invoice

    def post(self, name, body):
        return APIClient().post(CALLBACK.format(name), body, format="json")

    def test_oauth_and_stk_push_request_body(self):
        fake = FakeHttp(
            {
                "/oauth/v1/generate": (200, fixture("oauth_response")),
                "/mpesa/stkpush/v1/processrequest": (200, fixture("stk_push_response")),
            }
        )
        client = DarajaClient(self.settings, http=fake, clock=lambda: "20191219102115")
        response = client.stk_push("254708374149", 11600, self.invoice.name, "Payment")
        self.assertEqual(response["CheckoutRequestID"], "ws_CO_191220191020363925")
        oauth, push = fake.calls
        self.assertEqual(oauth["auth"], ("key", "secret"))
        self.assertEqual(push["headers"]["Authorization"], "Bearer c9SQxWWhmdVRlyFqxn1jEVHJ9cb3")
        expected_password = base64.b64encode(b"600638passkey20191219102115").decode()
        self.assertEqual(
            push["body"],
            {
                "BusinessShortCode": "600638",
                "Password": expected_password,
                "Timestamp": "20191219102115",
                "TransactionType": "CustomerPayBillOnline",
                "Amount": 11600,
                "PartyA": "254708374149",
                "PartyB": "600638",
                "PhoneNumber": "254708374149",
                "CallBackURL": "https://erp.example.com/api/erpnext/method/erpnext.erpnext_integrations.mpesa.callbacks.stk_callback/?token=secret-token",
                "AccountReference": self.invoice.name,
                "TransactionDesc": "Payment",
            },
        )

    def test_failed_http_raises(self):
        fake = FakeHttp({"/oauth/v1/generate": (400, {"errorMessage": "bad"})})
        with self.assertRaises(DarajaError):
            DarajaClient(self.settings, http=fake).token()

    def test_c2b_confirmation_creates_payment_entry_and_reconciles(self):
        body = fixture("c2b_confirmation")
        body["BillRefNumber"] = self.invoice.name
        response = self.post("c2b_confirmation", body)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], {"ResultCode": 0, "ResultDesc": "Accepted"})
        transaction = frappe.get_doc("M-Pesa Transaction", {"receipt_number": "RKTQDM7W6S"})
        self.assertEqual(transaction.status, "Completed")
        self.assertEqual(transaction.sales_invoice, self.invoice.name)
        entry = frappe.get_doc("Payment Entry", transaction.payment_entry)
        self.assertEqual(entry.docstatus, 1)
        self.assertEqual(entry.paid_amount, 11600)
        self.assertEqual(entry.reference_no, "RKTQDM7W6S")
        self.assertEqual(entry.paid_to, "Cash - MPL")
        self.assertEqual(
            [(r.reference_doctype, r.reference_name, r.allocated_amount) for r in entry.references],
            [("Sales Invoice", self.invoice.name, 11600)],
        )
        self.assertEqual(frappe.db.get_value("Sales Invoice", self.invoice.name, "outstanding_amount"), 0)
        entries = sorted(
            (e.account, float(e.debit), float(e.credit))
            for e in get_model("GL Entry").objects.filter(voucher_no=entry.name, is_cancelled=0)
        )
        self.assertEqual(entries, [("Cash - MPL", 11600.0, 0.0), ("Debtors - MPL", 0.0, 11600.0)])

    def test_c2b_confirmation_is_idempotent(self):
        body = fixture("c2b_confirmation")
        body["BillRefNumber"] = self.invoice.name
        self.post("c2b_confirmation", body)
        self.post("c2b_confirmation", body)
        self.assertEqual(get_model("M-Pesa Transaction").objects.filter(receipt_number="RKTQDM7W6S").count(), 1)
        self.assertEqual(get_model("Payment Entry").objects.filter(reference_no="RKTQDM7W6S").count(), 1)

    def test_c2b_unmatched_reference_is_recorded_unreconciled(self):
        body = fixture("c2b_confirmation")
        body["BillRefNumber"] = "NO-SUCH-INVOICE"
        self.post("c2b_confirmation", body)
        transaction = frappe.get_doc("M-Pesa Transaction", {"receipt_number": "RKTQDM7W6S"})
        self.assertFalse(transaction.payment_entry)

    def test_c2b_validation_rejects_unknown_invoice(self):
        body = fixture("c2b_confirmation")
        body["BillRefNumber"] = "NO-SUCH-INVOICE"
        self.assertEqual(self.post("c2b_validation", body).json()["message"]["ResultCode"], "C2B00012")
        body["BillRefNumber"] = self.invoice.name
        self.assertEqual(self.post("c2b_validation", body).json()["message"]["ResultCode"], 0)

    def test_callback_rejects_wrong_token(self):
        response = APIClient().post(
            "/api/erpnext/method/erpnext.erpnext_integrations.mpesa.callbacks.c2b_confirmation/?token=wrong",
            fixture("c2b_confirmation"),
            format="json",
        )
        self.assertGreaterEqual(response.status_code, 400)
        self.assertFalse(get_model("M-Pesa Transaction").objects.exists())

    def test_callback_rejects_disallowed_ip(self):
        self.settings.allowed_ips = "196.201.214.200"
        self.settings.save()
        response = self.post("c2b_confirmation", fixture("c2b_confirmation"))
        self.assertGreaterEqual(response.status_code, 400)
        self.assertFalse(get_model("M-Pesa Transaction").objects.exists())

    def test_non_guest_method_requires_authentication(self):
        response = APIClient().post(
            "/api/erpnext/method/erpnext.erpnext_integrations.mpesa.api.register_c2b_urls/", {}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_stk_flow_from_payment_request(self):
        fake = FakeHttp(
            {
                "/oauth/v1/generate": (200, fixture("oauth_response")),
                "/mpesa/stkpush/v1/processrequest": (200, fixture("stk_push_response")),
            }
        )
        payments.HTTP["call"] = fake
        self.addCleanup(payments.HTTP.update, {"call": payments.requests_http})
        request = new_doc("Payment Request")
        request.payment_request_type = "Inward"
        request.party_type = "Customer"
        request.party = "Mpesa Customer"
        request.company = self.company
        request.reference_doctype = "Sales Invoice"
        request.reference_name = self.invoice.name
        request.grand_total = 11600
        request.currency = "KES"
        request.insert(ignore_permissions=True, ignore_mandatory=True)
        transaction = payments.start_stk_push(request.name, "254708374149")
        self.assertEqual(transaction.status, "Pending")
        self.assertEqual(transaction.checkout_request_id, "ws_CO_191220191020363925")
        body = fixture("stk_callback_success")
        self.post("stk_callback", body)
        transaction = frappe.get_doc("M-Pesa Transaction", transaction.name)
        self.assertEqual(transaction.status, "Completed")
        self.assertEqual(transaction.receipt_number, "NLJ7RT61SV")
        self.assertTrue(transaction.payment_entry)
        self.assertEqual(frappe.db.get_value("Sales Invoice", self.invoice.name, "outstanding_amount"), 0)
        self.post("stk_callback", body)
        self.assertEqual(get_model("M-Pesa Transaction").objects.filter(receipt_number="NLJ7RT61SV").count(), 1)

    def test_stk_cancelled_callback_marks_transaction(self):
        frappe.get_doc(
            {
                "doctype": "M-Pesa Transaction",
                "transaction_type": "STK Push",
                "status": "Pending",
                "checkout_request_id": "ws_CO_191220191020363926",
            }
        ).insert()
        self.post("stk_callback", fixture("stk_callback_cancelled"))
        transaction = frappe.get_doc("M-Pesa Transaction", {"checkout_request_id": "ws_CO_191220191020363926"})
        self.assertEqual(transaction.status, "Cancelled")
        self.assertEqual(transaction.result_code, "1032")

    def test_b2c_request_and_result(self):
        fake = FakeHttp(
            {
                "/oauth/v1/generate": (200, fixture("oauth_response")),
                "/mpesa/b2c/v1/paymentrequest": (200, fixture("b2c_response")),
            }
        )
        DarajaClient(self.settings, http=fake).b2c_payment("254708374149", 8000, "Payout", occasion="PE-1")
        body = fake.calls[-1]["body"]
        self.assertEqual(body["CommandID"], "BusinessPayment")
        self.assertEqual(body["PartyA"], "600638")
        self.assertEqual(body["PartyB"], "254708374149")
        self.assertEqual(body["Amount"], 8000)
        self.assertEqual(body["InitiatorName"], "testapi")
        self.assertTrue(body["ResultURL"].endswith("callbacks.b2c_result/?token=secret-token"))
        frappe.get_doc(
            {
                "doctype": "M-Pesa Transaction",
                "transaction_type": "B2C",
                "status": "Pending",
                "originator_conversation_id": "16740-34861180-1",
            }
        ).insert()
        self.post("b2c_result", fixture("b2c_result"))
        transaction = frappe.get_doc("M-Pesa Transaction", {"originator_conversation_id": "16740-34861180-1"})
        self.assertEqual(transaction.status, "Completed")
        self.assertEqual(transaction.receipt_number, "NLJ41HAY6Q")
        self.assertEqual(transaction.amount, 8000)

    def test_status_reversal_and_registration_request_bodies(self):
        fake = FakeHttp(
            {
                "/oauth/v1/generate": (200, fixture("oauth_response")),
                "/mpesa/transactionstatus/v1/query": (200, {"ResponseCode": "0"}),
                "/mpesa/reversal/v1/request": (200, {"ResponseCode": "0"}),
                "/mpesa/c2b/v1/registerurl": (200, {"ResponseDescription": "Success"}),
            }
        )
        client = DarajaClient(self.settings, http=fake)
        client.transaction_status("RKTQDM7W6S")
        status = fake.calls[-1]["body"]
        self.assertEqual(
            (status["CommandID"], status["IdentifierType"], status["TransactionID"]),
            ("TransactionStatusQuery", "4", "RKTQDM7W6S"),
        )
        client.reversal("RKTQDM7W6S", 100)
        reversal = fake.calls[-1]["body"]
        self.assertEqual(
            (reversal["CommandID"], reversal["RecieverIdentifierType"], reversal["Amount"]),
            ("TransactionReversal", "11", 100),
        )
        client.register_c2b_urls()
        register = fake.calls[-1]["body"]
        self.assertEqual(register["ShortCode"], "600638")
        self.assertEqual(register["ResponseType"], "Completed")
