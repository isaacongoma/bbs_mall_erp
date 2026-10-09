import json
from pathlib import Path

from django.test import TestCase

import frappe
from apps.erpnext.erpnext_integrations.etims import service
from apps.erpnext.erpnext_integrations.etims.oscu import OscuProvider
from apps.erpnext.erpnext_integrations.etims.provider import EtimsError, EtimsProvider
from apps.erpnext.regional.kenya.setup import setup
from apps.frappe import exceptions
from apps.frappe.runtime import new_doc, session

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def fixture(name):
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


class FakeKra:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, url, body, headers):
        self.calls.append({"url": url, "body": body, "headers": headers})
        return self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]


class EtimsTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.addCleanup(service.HTTP.update, {"call": service.HTTP["call"]})
        company = new_doc("Company")
        company.company_name = "Etims Ltd"
        company.abbr = "ETL"
        company.default_currency = "KES"
        company.country = "Kenya"
        company.chart_of_accounts = "Standard"
        company.insert()
        self.company = company.name
        setup(self.company)
        settings = new_doc("eTIMS Settings")
        settings.update(
            {
                "company": self.company,
                "branch_id": "00",
                "provider": "OSCU KRA",
                "environment": "Sandbox",
                "is_active": 1,
                "server_url": "https://etims-api-sbx.kra.go.ke/etims-api",
                "tin": "P051234567Z",
                "device_serial_number": "DVC0001",
                "communication_key": "CMC-KEY",
            }
        )
        settings.insert()
        self.settings = settings
        customer = new_doc("Customer")
        customer.customer_name = "Etims Customer"
        customer.customer_type = "Company"
        customer.kra_pin = "A123456789Z"
        customer.insert()
        supplier = new_doc("Supplier")
        supplier.supplier_name = "Etims Supplier"
        supplier.supplier_group = "All Supplier Groups"
        supplier.kra_pin = "P987654321Y"
        supplier.insert()
        price_list = new_doc("Price List")
        price_list.price_list_name = "Standard Selling"
        price_list.currency = "KES"
        price_list.selling = 1
        price_list.enabled = 1
        price_list.insert(ignore_if_duplicate=True)
        item = new_doc("Item")
        item.item_code = "ET-SERVICE"
        item.item_name = "Service"
        item.item_group = "All Item Groups"
        item.stock_uom = "Nos"
        item.is_stock_item = 0
        item.kenya_vat_treatment = "Standard"
        item.etims_item_code = "KE1NTXU0000001"
        item.etims_item_class_code = "5059690800"
        item.insert()
        fiscal_year = new_doc("Fiscal Year")
        fiscal_year.year = "2026"
        fiscal_year.year_start_date = "2026-01-01"
        fiscal_year.year_end_date = "2026-12-31"
        fiscal_year.insert(ignore_if_duplicate=True)

    def make_sales_invoice(self, submit=True):
        invoice = new_doc("Sales Invoice")
        invoice.customer = "Etims Customer"
        invoice.company = self.company
        invoice.debit_to = "Debtors - ETL"
        invoice.set_posting_time = 1
        invoice.posting_date = "2026-10-03"
        invoice.posting_time = "10:00:00"
        invoice.due_date = "2026-10-31"
        invoice.currency = "KES"
        invoice.selling_price_list = "Standard Selling"
        invoice.price_list_currency = "KES"
        invoice.plc_conversion_rate = 1
        invoice.conversion_rate = 1
        invoice.taxes_and_charges = "Kenya VAT 16% - ETL"
        invoice.append("items", {"item_code": "ET-SERVICE", "qty": 1, "rate": 10000, "income_account": "Sales - ETL"})
        invoice.set_missing_values()
        invoice.calculate_taxes_and_totals()
        invoice.insert()
        if submit:
            invoice.submit()
        return invoice

    def test_provider_contract_is_abstract(self):
        with self.assertRaises(TypeError):
            EtimsProvider()

    def test_device_initialization_request_and_settings_update(self):
        fake = FakeKra([(200, fixture("etims_init_response"))])
        service.HTTP["call"] = fake
        settings = service.initialize_device(self.settings.name)
        call = fake.calls[0]
        self.assertEqual(call["url"], "https://etims-api-sbx.kra.go.ke/etims-api/selectInitOsdcInfo")
        self.assertEqual(call["body"], {"tin": "P051234567Z", "bhfId": "00", "dvcSrlNo": "DVC0001"})
        self.assertNotIn("cmcKey", call["headers"])
        self.assertEqual((settings.scu_id, settings.mrc_no), ("KRACU0100000001", "WWWXXXXXXXXX"))
        self.assertEqual(settings.get_password("communication_key"), "CMC-KEY-FROM-KRA")

    def test_sales_invoice_submission_request_body_and_stored_response(self):
        fake = FakeKra([(200, fixture("etims_sales_response"))])
        service.HTTP["call"] = fake
        invoice = self.make_sales_invoice()
        self.assertEqual(len(fake.calls), 1)
        call = fake.calls[0]
        self.assertEqual(call["url"], "https://etims-api-sbx.kra.go.ke/etims-api/saveTrnsSalesOsdc")
        self.assertEqual(call["headers"], {"tin": "P051234567Z", "bhfId": "00", "cmcKey": "CMC-KEY", "Content-Type": "application/json"})
        body = call["body"]
        self.assertEqual(body["invcNo"], int(invoice.name.split("-")[-1]))
        self.assertEqual(body["orgInvcNo"], 0)
        self.assertEqual(body["trdInvcNo"], invoice.name)
        self.assertEqual(body["custTin"], "A123456789Z")
        self.assertEqual(body["rcptTyCd"], "S")
        self.assertEqual((body["pmtTyCd"], body["salesSttsCd"]), ("01", "02"))
        self.assertEqual((body["cfmDt"], body["salesDt"]), ("20261003100000", "20261003"))
        self.assertEqual((body["taxRtB"], body["taxblAmtB"], body["taxAmtB"]), (16.0, 10000.0, 1600.0))
        for key in ("A", "C", "D", "E"):
            self.assertEqual((body[f"taxblAmt{key}"], body[f"taxAmt{key}"]), (0.0, 0.0))
        self.assertEqual((body["totTaxblAmt"], body["totTaxAmt"], body["totAmt"]), (10000.0, 1600.0, 11600.0))
        self.assertEqual(body["totItemCnt"], 1)
        self.assertEqual(
            body["itemList"],
            [
                {
                    "itemSeq": 1,
                    "itemCd": "KE1NTXU0000001",
                    "itemClsCd": "5059690800",
                    "itemNm": "Service",
                    "bcd": None,
                    "pkgUnitCd": "NT",
                    "pkg": 1,
                    "qtyUnitCd": "U",
                    "qty": 1.0,
                    "prc": 10000.0,
                    "splyAmt": 10000.0,
                    "dcRt": 0,
                    "dcAmt": 0,
                    "taxTyCd": "B",
                    "taxblAmt": 10000.0,
                    "taxAmt": 1600.0,
                    "totAmt": 11600.0,
                }
            ],
        )
        stored = frappe.db.get_value(
            "Sales Invoice",
            invoice.name,
            [
                "etims_submitted",
                "etims_receipt_number",
                "etims_total_receipt_number",
                "etims_internal_data",
                "etims_receipt_signature",
                "etims_scu_id",
                "etims_scu_datetime",
                "etims_qr_url",
            ],
            as_dict=True,
        )
        self.assertEqual(stored.etims_submitted, 1)
        self.assertEqual(stored.etims_receipt_number, "1")
        self.assertEqual(stored.etims_internal_data, "VYJQKTPQZNQYXZ5XVQQTYF6IQM")
        self.assertEqual(stored.etims_receipt_signature, "ENC7YQUAEWNDMNHKQ5ZHDXPRMI")
        self.assertEqual(stored.etims_scu_id, "KRACU0100000001")
        self.assertEqual(
            stored.etims_qr_url,
            "https://etims-sbx.kra.go.ke/common/link/etims/receipt/indexEtimsReceiptData?Data=P051234567Z00ENC7YQUAEWNDMNHKQ5ZHDXPRMI",
        )
        submission = frappe.get_doc("eTIMS Submission", frappe.db.get_value("Sales Invoice", invoice.name, "etims_submission"))
        self.assertEqual((submission.status, submission.attempts, submission.document_type), ("Submitted", 1, "Sales Invoice"))

    def test_qr_data_for_print(self):
        service.HTTP["call"] = FakeKra([(200, fixture("etims_sales_response"))])
        invoice = self.make_sales_invoice()
        from apps.erpnext.erpnext_integrations.etims.api import get_receipt_qr

        qr = get_receipt_qr("Sales Invoice", invoice.name)
        self.assertTrue(qr["url"].endswith("P051234567Z00ENC7YQUAEWNDMNHKQ5ZHDXPRMI"))
        self.assertTrue(qr["image"].startswith("data:image/png;base64,"))

    def test_failure_is_recorded_and_retry_succeeds(self):
        failure = {"resultCd": "902", "resultMsg": "Invalid device", "resultDt": "20261003100005", "data": None}
        service.HTTP["call"] = FakeKra([(200, failure)])
        invoice = self.make_sales_invoice()
        submission = frappe.get_doc("eTIMS Submission", {"reference_name": invoice.name})
        self.assertEqual((submission.status, submission.result_code, submission.result_message, submission.attempts), ("Failed", "902", "Invalid device", 1))
        self.assertEqual(frappe.db.get_value("Sales Invoice", invoice.name, "etims_submitted"), 0)
        service.HTTP["call"] = FakeKra([(200, fixture("etims_sales_response"))])
        service.retry_failed_submissions()
        submission = frappe.get_doc("eTIMS Submission", submission.name)
        self.assertEqual((submission.status, submission.attempts), ("Submitted", 2))
        self.assertEqual(frappe.db.get_value("Sales Invoice", invoice.name, "etims_submitted"), 1)

    def test_retry_stops_at_max_attempts(self):
        failure = {"resultCd": "902", "resultMsg": "Invalid device", "resultDt": "20261003100005", "data": None}
        fake = FakeKra([(200, failure)])
        service.HTTP["call"] = fake
        self.settings.max_attempts = 2
        self.settings.save()
        self.make_sales_invoice()
        service.retry_failed_submissions()
        service.retry_failed_submissions()
        self.assertEqual(len(fake.calls), 2)

    def test_manual_resubmit(self):
        failure = {"resultCd": "902", "resultMsg": "Invalid device", "resultDt": "20261003100005", "data": None}
        service.HTTP["call"] = FakeKra([(200, failure)])
        invoice = self.make_sales_invoice()
        service.HTTP["call"] = FakeKra([(200, fixture("etims_sales_response"))])
        from apps.erpnext.erpnext_integrations.etims.api import resubmit

        self.assertEqual(resubmit("Sales Invoice", invoice.name)["status"], "Submitted")

    def test_http_error_status_is_a_failure(self):
        service.HTTP["call"] = FakeKra([(500, {"error": "boom"})])
        invoice = self.make_sales_invoice()
        submission = frappe.get_doc("eTIMS Submission", {"reference_name": invoice.name})
        self.assertEqual((submission.status, submission.result_code), ("Failed", "500"))

    def test_submitted_invoice_cannot_be_cancelled(self):
        service.HTTP["call"] = FakeKra([(200, fixture("etims_sales_response"))])
        invoice = self.make_sales_invoice()
        with self.assertRaises(exceptions.ValidationError):
            invoice.cancel()

    def test_no_active_settings_means_no_submission(self):
        self.settings.is_active = 0
        self.settings.save()
        fake = FakeKra([(200, fixture("etims_sales_response"))])
        service.HTTP["call"] = fake
        self.make_sales_invoice()
        self.assertEqual(fake.calls, [])
        self.assertFalse(frappe.db.exists("eTIMS Submission", {"company": self.company}))

    def test_deferred_submission_is_not_sent(self):
        fake = FakeKra([(200, fixture("etims_sales_response"))])
        service.HTTP["call"] = fake
        invoice = self.make_sales_invoice(submit=False)
        invoice.etims_defer_submission = 1
        invoice.save()
        invoice.submit()
        self.assertEqual(fake.calls, [])

    def test_credit_note_payload(self):
        fake = FakeKra([(200, fixture("etims_sales_response"))])
        service.HTTP["call"] = fake
        invoice = self.make_sales_invoice()
        from apps.erpnext.controllers.sales_and_purchase_return import make_return_doc

        credit = make_return_doc("Sales Invoice", invoice.name)
        credit.set_posting_time = 1
        credit.posting_date = "2026-10-04"
        credit.posting_time = "09:00:00"
        credit.insert()
        credit.submit()
        body = fake.calls[-1]["body"]
        self.assertEqual(body["rcptTyCd"], "R")
        self.assertEqual(body["orgInvcNo"], int(invoice.name.split("-")[-1]))
        self.assertEqual((body["totTaxblAmt"], body["totTaxAmt"], body["totAmt"]), (10000.0, 1600.0, 11600.0))
        self.assertEqual(frappe.get_doc("eTIMS Submission", {"reference_name": credit.name}).document_type, "Credit Note")

    def test_oscu_provider_rejects_non_success_codes(self):
        provider = OscuProvider(self.settings, http=FakeKra([(200, {"resultCd": "910", "resultMsg": "bad"})]))
        with self.assertRaises(EtimsError):
            provider.fetch_code_lists()
        fake = FakeKra([(200, {"resultCd": "000", "resultMsg": "ok", "data": {}})])
        OscuProvider(self.settings, http=fake).fetch_code_lists()
        self.assertEqual(fake.calls[0]["body"], {"lastReqDt": "20200101000000"})
        self.assertTrue(fake.calls[0]["url"].endswith("/selectCodeList"))
