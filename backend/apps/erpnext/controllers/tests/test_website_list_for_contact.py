import json

from erpnext.tests.utils import ERPNextTestSuite


class TestWebsiteListForContact(ERPNextTestSuite):
    def test_get_list_context_currency_symbols(self):
        from erpnext.controllers.website_list_for_contact import get_list_context

        context = get_list_context()

        symbols = json.loads(context["currency_symbols"])
        self.assertIsInstance(symbols, dict)
        self.assertIn("USD", symbols)

    def test_rfq_transaction_list_returns_supplier_rfq(self):
        from erpnext.buying.doctype.request_for_quotation.test_request_for_quotation import (
            make_request_for_quotation,
        )
        from erpnext.controllers.website_list_for_contact import rfq_transaction_list

        rfq = make_request_for_quotation()
        supplier = rfq.suppliers[0].supplier

        rows = rfq_transaction_list(
            "Request for Quotation Supplier", "Request for Quotation", [supplier], 0, 20
        )
        self.assertIn(rfq.name, [row.name for row in rows])
