import json

import frappe
from frappe.utils import add_days, flt, getdate, nowdate

from erpnext.accounts.party import get_due_date
from erpnext.exceptions import PartyDisabled, PartyFrozen
from erpnext.selling.doctype.customer.customer import (
    get_credit_limit,
    get_customer_outstanding,
    get_customer_overdue_amount,
    get_overdue_billing_threshold,
)
from erpnext.selling.doctype.customer.mapper import (
    make_quotation,
    parse_full_name,
)
from erpnext.setup.utils import get_exchange_rate
from erpnext.tests.utils import ERPNextTestSuite


class TestCustomer(ERPNextTestSuite):
    def test_quotation_from_customer_uses_actual_exchange_rate(self):
        company = "_Test Company"
        company_currency = frappe.get_cached_value("Company", company, "default_currency")
        foreign_currency = "USD" if company_currency != "USD" else "EUR"

        original_company = frappe.defaults.get_user_default("company")
        frappe.defaults.set_user_default("company", company)
        try:
            expected_rate = get_exchange_rate(foreign_currency, company_currency, nowdate())

            customer = frappe.get_doc(
                {
                    "doctype": "Customer",
                    "customer_name": "_Test Customer FX Quotation",
                    "customer_type": "Company",
                    "default_currency": foreign_currency,
                }
            ).insert()

            quotation = make_quotation(customer.name)

            self.assertEqual(quotation.currency, foreign_currency)
            self.assertNotEqual(flt(quotation.conversion_rate), 1.0)
            self.assertNotEqual(flt(quotation.conversion_rate), 0.0)
            self.assertEqual(flt(quotation.conversion_rate), flt(expected_rate))
        finally:
            frappe.defaults.set_user_default("company", original_company)

    def test_get_customer_name_dedupes_with_numeric_suffix(self):
        base = "_Test PG Dedup Customer"
        for nm in (base, f"{base} - 3"):
            if not frappe.db.exists("Customer", nm):
                frappe.get_doc(
                    {"doctype": "Customer", "customer_name": nm, "customer_type": "Individual"}
                ).insert()

        doc = frappe.get_doc({"doctype": "Customer", "customer_name": base, "customer_type": "Individual"})
        self.assertEqual(doc.get_customer_name(), f"{base} - 4")

    def test_get_customer_name_dedupe_handles_mixed_suffix(self):
        base = "_Test PG Dedup Mixed"
        for nm in (base, f"{base} - 3a"):
            if not frappe.db.exists("Customer", nm):
                frappe.get_doc(
                    {"doctype": "Customer", "customer_name": nm, "customer_type": "Individual"}
                ).insert()

        doc = frappe.get_doc({"doctype": "Customer", "customer_name": base, "customer_type": "Individual"})
        self.assertEqual(doc.get_customer_name(), f"{base} - 4")

    def test_get_customer_group_details(self):
        doc = frappe.new_doc("Customer Group")
        doc.customer_group_name = "_Testing Customer Group"
        doc.payment_terms = "_Test Payment Term Template 3"
        doc.accounts = []
        doc.default_price_list = "Standard Buying"
        doc.credit_limits = []
        test_account_details = {
            "company": "_Test Company",
            "account": "Creditors - _TC",
        }
        test_credit_limits = {
            "company": "_Test Company",
            "credit_limit": 350000,
            "overdue_billing_threshold": 5000,
        }
        doc.append("accounts", test_account_details)
        doc.append("credit_limits", test_credit_limits)
        doc.insert()

        c_doc = frappe.new_doc("Customer")
        c_doc.customer_name = "Testing Customer"
        c_doc.customer_group = "_Testing Customer Group"
        c_doc.payment_terms = c_doc.default_price_list = ""
        c_doc.accounts = []
        c_doc.credit_limits = []
        c_doc.insert()
        c_doc.get_customer_group_details()
        self.assertEqual(c_doc.payment_terms, "_Test Payment Term Template 3")

        self.assertEqual(c_doc.accounts[0].company, "_Test Company")
        self.assertEqual(c_doc.accounts[0].account, "Creditors - _TC")

        self.assertEqual(c_doc.credit_limits[0].company, "_Test Company")
        self.assertEqual(c_doc.credit_limits[0].credit_limit, 350000)
        self.assertEqual(c_doc.credit_limits[0].overdue_billing_threshold, 5000)
        c_doc.delete()
        doc.delete()

    def test_party_details(self):
        from erpnext.accounts.party import _get_party_details

        to_check = {
            "selling_price_list": None,
            "customer_group": "_Test Customer Group",
            "contact_designation": None,
            "customer_address": "_Test Address for Customer-Office",
            "contact_department": None,
            "contact_email": "test_contact_customer@example.com",
            "contact_mobile": None,
            "sales_team": [],
            "contact_display": "_Test Contact for _Test Customer",
            "contact_person": "_Test Contact for _Test Customer-_Test Customer",
            "territory": "_Test Territory",
            "contact_phone": "+91 0000000000",
            "customer_name": "_Test Customer",
        }

        frappe.db.set_value(
            "Contact", "_Test Contact for _Test Customer-_Test Customer", "is_primary_contact", 1
        )

        details = _get_party_details("_Test Customer")

        for key, value in to_check.items():
            val = details.get(key)
            if not val and not isinstance(val, list):
                val = None

            self.assertEqual(value, val)

    def test_party_details_tax_category(self):
        from erpnext.accounts.party import _get_party_details

        details = _get_party_details("_Test Customer With Tax Category")
        self.assertEqual(details.tax_category, "_Test Tax Category 1")

        frappe.get_doc(
            doctype="Address",
            address_title="_Test Address With Tax Category",
            tax_category="_Test Tax Category 2",
            address_type="Billing",
            address_line1="Station Road",
            city="_Test City",
            country="India",
            is_primary_address=True,
            links=[dict(link_doctype="Customer", link_name="_Test Customer With Tax Category")],
        ).insert()
        frappe.get_doc(
            doctype="Address",
            address_title="_Test Address With Tax Category",
            tax_category="_Test Tax Category 3",
            address_type="Shipping",
            address_line1="Station Road",
            city="_Test City",
            country="India",
            is_shipping_address=True,
            links=[dict(link_doctype="Customer", link_name="_Test Customer With Tax Category")],
        ).insert()

        settings = frappe.get_single("Accounts Settings")
        rollback_setting = settings.determine_address_tax_category_from

        settings.determine_address_tax_category_from = "Billing Address"
        settings.save()
        details = _get_party_details("_Test Customer With Tax Category")
        self.assertEqual(details.tax_category, "_Test Tax Category 2")

        settings.determine_address_tax_category_from = "Shipping Address"
        settings.save()
        details = _get_party_details("_Test Customer With Tax Category")
        self.assertEqual(details.tax_category, "_Test Tax Category 3")

        settings.determine_address_tax_category_from = rollback_setting
        settings.save()

    def test_rename(self):

        new_name = "_Test Customer 1 Renamed"

        comment = frappe.get_doc("Customer", "_Test Customer 1").add_comment(
            "Comment", "Test Comment for Rename"
        )

        frappe.rename_doc("Customer", "_Test Customer 1", new_name)

        self.assertTrue(frappe.db.exists("Customer", new_name))
        self.assertFalse(frappe.db.exists("Customer", "_Test Customer 1"))

        self.assertEqual(
            frappe.db.get_value(
                "Comment",
                {
                    "reference_doctype": "Customer",
                    "reference_name": new_name,
                    "content": "Test Comment for Rename",
                },
            ),
            comment.name,
        )

        frappe.rename_doc("Customer", new_name, "_Test Customer 1")

    def test_freezed_customer(self):
        frappe.db.set_value("Customer", "_Test Customer", "is_frozen", 1)

        from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order

        so = make_sales_order(do_not_save=True)

        self.assertRaises(PartyFrozen, so.save)

        frappe.db.set_value("Customer", "_Test Customer", "is_frozen", 0)

        so.save()

    def test_delete_customer_contact(self):
        customer = frappe.get_doc(get_customer_dict("_Test Customer for delete")).insert(
            ignore_permissions=True
        )

        customer.mobile_no = "8989889890"
        customer.save()
        self.assertTrue(customer.customer_primary_contact)
        frappe.delete_doc("Customer", customer.name)

    def test_disabled_customer(self):
        frappe.db.set_value("Customer", "_Test Customer", "disabled", 1)

        from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order

        so = make_sales_order(do_not_save=True)

        self.assertRaises(PartyDisabled, so.save)

        frappe.db.set_value("Customer", "_Test Customer", "disabled", 0)

        so.save()

    def test_blocked_customer(self):
        from erpnext.selling.doctype.quotation.test_quotation import make_quotation
        from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order

        customer = frappe.get_doc("Customer", "_Test Customer")
        customer.on_hold = 1
        customer.release_date = nowdate()
        customer.save()

        make_quotation(do_not_save=True).save()

        sales_order = make_sales_order(do_not_save=True)
        self.assertRaisesRegex(frappe.ValidationError, "is blocked", sales_order.save)

        customer.release_date = add_days(nowdate(), -1)
        customer.save()
        sales_order.save()

    def test_duplicate_customer(self):
        if not frappe.db.get_value("Customer", "_Test Customer 1"):
            test_customer_1 = frappe.get_doc(get_customer_dict("_Test Customer 1")).insert(
                ignore_permissions=True
            )
        else:
            test_customer_1 = frappe.get_doc("Customer", "_Test Customer 1")

        duplicate_customer = frappe.get_doc(get_customer_dict("_Test Customer 1")).insert(
            ignore_permissions=True
        )

        self.assertEqual("_Test Customer 1", test_customer_1.name)
        self.assertEqual("_Test Customer 1 - 1", duplicate_customer.name)
        self.assertEqual(test_customer_1.customer_name, duplicate_customer.customer_name)

    def get_customer_outstanding_amount(self):
        from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order

        outstanding_amt = get_customer_outstanding("_Test Customer", "_Test Company")

        if outstanding_amt > 0.0:
            return outstanding_amt

        item_qty = int((abs(outstanding_amt) + 200) / 100)
        make_sales_order(qty=item_qty)
        return get_customer_outstanding("_Test Customer", "_Test Company")

    def test_customer_credit_limit(self):
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice
        from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order
        from erpnext.stock.doctype.delivery_note.test_delivery_note import create_delivery_note

        outstanding_amt = self.get_customer_outstanding_amount()
        credit_limit = get_credit_limit("_Test Customer", "_Test Company")

        if outstanding_amt <= 0.0:
            item_qty = int((abs(outstanding_amt) + 200) / 100)
            make_sales_order(qty=item_qty)

        if not credit_limit:
            set_credit_limit("_Test Customer", "_Test Company", outstanding_amt - 50)

        so = make_sales_order(do_not_submit=True)
        self.assertRaises(frappe.ValidationError, so.submit)

        dn = create_delivery_note(do_not_submit=True)
        self.assertRaises(frappe.ValidationError, dn.submit)

        si = create_sales_invoice(do_not_submit=True)
        self.assertRaises(frappe.ValidationError, si.submit)

        if credit_limit > outstanding_amt:
            set_credit_limit("_Test Customer", "_Test Company", credit_limit)

    def test_customer_credit_limit_after_submit(self):
        from erpnext.controllers.accounts_controller import update_child_qty_rate
        from erpnext.selling.doctype.sales_order.test_sales_order import make_sales_order

        outstanding_amt = self.get_customer_outstanding_amount()
        credit_limit = get_credit_limit("_Test Customer", "_Test Company")

        if outstanding_amt <= 0.0:
            item_qty = int((abs(outstanding_amt) + 200) / 100)
            make_sales_order(qty=item_qty)

        if credit_limit <= 0.0:
            set_credit_limit("_Test Customer", "_Test Company", outstanding_amt + 100)

        so = make_sales_order(rate=100, qty=1)
        fields = ["name", "item_code", "delivery_date", "conversion_factor", "qty", "rate", "uom", "idx"]
        modified_item = frappe._dict()
        for x in fields:
            modified_item[x] = so.items[0].get(x)
        modified_item["docname"] = so.items[0].name
        modified_item["qty"] = 2
        self.assertRaises(
            frappe.ValidationError,
            update_child_qty_rate,
            so.doctype,
            json.dumps([modified_item]),
            so.name,
        )

    def test_customer_credit_limit_on_change(self):
        outstanding_amt = self.get_customer_outstanding_amount()
        customer = frappe.get_doc("Customer", "_Test Customer")
        customer.append(
            "credit_limits", {"credit_limit": flt(outstanding_amt - 100), "company": "_Test Company"}
        )

        """ define new credit limit for same company """
        customer.append(
            "credit_limits", {"credit_limit": flt(outstanding_amt - 100), "company": "_Test Company"}
        )
        self.assertRaises(frappe.ValidationError, customer.save)

    def test_get_customer_overdue_amount(self):
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

        baseline = get_customer_overdue_amount("_Test Customer", "_Test Company")

        create_sales_invoice(qty=1, rate=500, posting_date=add_days(nowdate(), -30))
        self.assertEqual(get_customer_overdue_amount("_Test Customer", "_Test Company"), baseline + 500)

        create_sales_invoice(qty=1, rate=700, posting_date=nowdate())
        self.assertEqual(get_customer_overdue_amount("_Test Customer", "_Test Company"), baseline + 500)

    def test_get_customer_overdue_amount_is_in_company_currency(self):
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

        baseline = get_customer_overdue_amount("_Test Customer USD", "_Test Company")

        create_sales_invoice(
            customer="_Test Customer USD",
            debit_to="_Test Receivable USD - _TC",
            currency="USD",
            conversion_rate=50,
            qty=1,
            rate=100,
            posting_date=add_days(nowdate(), -30),
        )

        self.assertEqual(get_customer_overdue_amount("_Test Customer USD", "_Test Company"), baseline + 5000)

    def test_get_customer_overdue_amount_follows_payment_terms(self):
        from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

        def make_invoice_with_terms():
            si = create_sales_invoice(
                qty=1, rate=1200, posting_date=add_days(nowdate(), -60), do_not_save=True
            )
            si.append("payment_schedule", {"due_date": add_days(nowdate(), -60), "invoice_portion": 50})
            si.append("payment_schedule", {"due_date": add_days(nowdate(), 30), "invoice_portion": 50})
            si.insert()
            si.submit()
            return si

        baseline = get_customer_overdue_amount("_Test Customer", "_Test Company")

        si = make_invoice_with_terms()
        self.assertEqual(getdate(si.due_date), getdate(add_days(nowdate(), 30)))
        self.assertEqual(get_customer_overdue_amount("_Test Customer", "_Test Company"), baseline + 600)

        pe = get_payment_entry("Sales Invoice", si.name, bank_account="_Test Bank - _TC")
        pe.reference_no = "_Test Overdue Payment"
        pe.reference_date = nowdate()
        pe.paid_amount = pe.received_amount = 600
        pe.references[0].allocated_amount = 600
        pe.insert()
        pe.submit()
        self.assertEqual(get_customer_overdue_amount("_Test Customer", "_Test Company"), baseline)

    def test_get_customer_overdue_amount_ignores_advance_reconciled_after_submit(self):
        from erpnext.accounts.doctype.payment_entry.test_payment_entry import create_payment_entry
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

        baseline = get_customer_overdue_amount("_Test Customer", "_Test Company")

        pe = create_payment_entry(
            company="_Test Company",
            party_type="Customer",
            party="_Test Customer",
            payment_type="Receive",
            paid_from="Debtors - _TC",
            paid_to="Cash - _TC",
            paid_amount=800,
        )
        pe.posting_date = add_days(nowdate(), -60)
        pe.submit()

        si = create_sales_invoice(qty=1, rate=800, posting_date=add_days(nowdate(), -30))
        self.assertEqual(get_customer_overdue_amount("_Test Customer", "_Test Company"), baseline + 800)

        reconcile_payment_against_invoice(pe, si)

        si.reload()
        self.assertEqual(si.outstanding_amount, 0)
        self.assertEqual(si.status, "Paid")
        self.assertEqual(get_customer_overdue_amount("_Test Customer", "_Test Company"), baseline)

    def test_overdue_billing_threshold_on_submit(self):
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

        create_sales_invoice(qty=1, rate=1000, posting_date=add_days(nowdate(), -30))
        overdue = get_customer_overdue_amount("_Test Customer", "_Test Company")

        settings = frappe.get_single("Accounts Settings")
        original_enable = settings.enable_overdue_billing_threshold
        original_bypass_role = settings.role_allowed_to_bypass_overdue_billing
        try:
            settings.enable_overdue_billing_threshold = 1
            settings.role_allowed_to_bypass_overdue_billing = None
            settings.save()
            set_overdue_billing_threshold("_Test Customer", "_Test Company", overdue - 100)

            si = create_sales_invoice(do_not_submit=True)
            self.assertRaises(frappe.ValidationError, si.submit)

            settings.role_allowed_to_bypass_overdue_billing = "Accounts Manager"
            settings.save()
            si = create_sales_invoice(do_not_submit=True)
            si.submit()
            self.assertEqual(si.docstatus, 1)

            settings.enable_overdue_billing_threshold = 0
            settings.role_allowed_to_bypass_overdue_billing = None
            settings.save()
            si = create_sales_invoice(do_not_submit=True)
            si.submit()
            self.assertEqual(si.docstatus, 1)
        finally:
            settings.enable_overdue_billing_threshold = original_enable
            settings.role_allowed_to_bypass_overdue_billing = original_bypass_role
            settings.save()

    def test_overdue_billing_threshold_falls_back_to_customer_group(self):
        customer_group = frappe.get_cached_value("Customer", "_Test Customer", "customer_group")
        group = frappe.get_doc("Customer Group", customer_group)

        group.credit_limits = []
        group.append("credit_limits", {"company": "_Test Company", "overdue_billing_threshold": 5000})
        group.save()

        self.assertEqual(get_overdue_billing_threshold("_Test Customer", "_Test Company"), 5000)

        set_overdue_billing_threshold("_Test Customer", "_Test Company", 2000)
        self.assertEqual(get_overdue_billing_threshold("_Test Customer", "_Test Company"), 2000)

        set_overdue_billing_threshold("_Test Customer", "_Test Company", 0)
        self.assertEqual(get_overdue_billing_threshold("_Test Customer", "_Test Company"), 5000)

    def test_overdue_threshold_row_without_credit_limit(self):
        from erpnext.accounts.doctype.sales_invoice.test_sales_invoice import create_sales_invoice

        create_sales_invoice(qty=1, rate=500)

        customer = frappe.get_doc("Customer", "_Test Customer")
        customer.credit_limits = []
        customer.append("credit_limits", {"company": "_Test Company", "overdue_billing_threshold": 1000})
        customer.save()

        self.assertEqual(customer.credit_limits[0].overdue_billing_threshold, 1000)
        self.assertEqual(flt(customer.credit_limits[0].credit_limit), 0.0)

    def test_customer_payment_terms(self):
        frappe.db.set_value(
            "Customer", "_Test Customer With Template", "payment_terms", "_Test Payment Term Template 3"
        )

        due_date = get_due_date("2016-01-22", "Customer", "_Test Customer With Template")
        self.assertEqual(due_date, "2016-02-21")

        due_date = get_due_date("2017-01-22", "Customer", "_Test Customer With Template")
        self.assertEqual(due_date, "2017-02-21")

        frappe.db.set_value(
            "Customer", "_Test Customer With Template", "payment_terms", "_Test Payment Term Template 1"
        )

        due_date = get_due_date("2016-01-22", "Customer", "_Test Customer With Template")
        self.assertEqual(due_date, "2016-02-29")

        due_date = get_due_date("2017-01-22", "Customer", "_Test Customer With Template")
        self.assertEqual(due_date, "2017-02-28")

        frappe.db.set_value("Customer", "_Test Customer With Template", "payment_terms", "")

        due_date = get_due_date("2016-01-22", "Customer", "_Test Customer")
        self.assertEqual(due_date, "2016-01-22")

        due_date = get_due_date("2017-01-22", "Customer", "_Test Customer")
        self.assertEqual(due_date, "2017-01-22")

    def test_parse_full_name(self):
        first, middle, last = parse_full_name("John")
        self.assertEqual(first, "John")
        self.assertEqual(middle, None)
        self.assertEqual(last, None)

        first, middle, last = parse_full_name("John Doe")
        self.assertEqual(first, "John")
        self.assertEqual(middle, None)
        self.assertEqual(last, "Doe")

        first, middle, last = parse_full_name("John Michael Doe")
        self.assertEqual(first, "John")
        self.assertEqual(middle, "Michael")
        self.assertEqual(last, "Doe")

    def test_get_notification_email(self):
        admin_email = frappe.db.get_value("User", "Administrator", "email")
        customer = frappe.new_doc("Customer")
        customer.account_manager = "Administrator"
        self.assertEqual(customer.get_notification_email(), admin_email)

        customer.account_manager = None
        self.assertIsNone(customer.get_notification_email())

    def test_portal_user_contact_link(self):
        user_email = frappe.generate_hash() + "@example.com"
        user = frappe.new_doc("User")
        user.email = user_email
        user.first_name = "Test Portal Customer User"
        user.send_welcome_email = False
        user.insert(ignore_permissions=True)

        contact = frappe.new_doc("Contact")
        contact.first_name = "Test Portal Customer User"
        contact.add_email(user_email, is_primary=1)
        contact.links = []
        contact.insert(ignore_permissions=True)

        customer = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_name": "Test Portal Contact Customer",
                "customer_type": "Individual",
            }
        )
        customer.append("portal_users", {"user": user.name})
        customer.insert()

        contact.reload()
        self.assertTrue(contact.has_link("Customer", customer.name))


def get_customer_dict(customer_name):
    return {
        "customer_group": "_Test Customer Group",
        "customer_name": customer_name,
        "customer_type": "Individual",
        "doctype": "Customer",
        "territory": "_Test Territory",
    }


def set_credit_limit(customer, company, credit_limit):
    customer = frappe.get_doc("Customer", customer)
    existing_row = None
    for d in customer.credit_limits:
        if d.company == company:
            existing_row = d
            d.credit_limit = credit_limit
            d.db_update()
            break

    if not existing_row:
        customer.append("credit_limits", {"company": company, "credit_limit": credit_limit})
        customer.credit_limits[-1].db_insert()


def reconcile_payment_against_invoice(payment_entry, sales_invoice):
    """Allocate an unlinked payment against an invoice through the reconciliation tool."""
    pr = frappe.get_doc(
        doctype="Payment Reconciliation",
        company=sales_invoice.company,
        party_type="Customer",
        party=sales_invoice.customer,
        receivable_payable_account=sales_invoice.debit_to,
    )
    pr.get_unreconciled_entries()
    pr.allocate_entries(
        frappe._dict(
            {
                "invoices": [d.as_dict() for d in pr.invoices if d.invoice_number == sales_invoice.name],
                "payments": [d.as_dict() for d in pr.payments if d.reference_name == payment_entry.name],
            }
        )
    )
    pr.reconcile()


def set_overdue_billing_threshold(customer, company, threshold):
    customer = frappe.get_doc("Customer", customer)
    for d in customer.credit_limits:
        if d.company == company:
            d.overdue_billing_threshold = threshold
            d.db_update()
            return

    customer.append("credit_limits", {"company": company, "overdue_billing_threshold": threshold})
    customer.credit_limits[-1].db_insert()


def create_internal_customer(customer_name=None, represents_company=None, allowed_to_interact_with=None):
    if not customer_name:
        customer_name = represents_company
    if not allowed_to_interact_with:
        allowed_to_interact_with = represents_company

    existing_representative = frappe.db.get_value("Customer", {"represents_company": represents_company})
    if existing_representative:
        return existing_representative

    if not frappe.db.exists("Customer", customer_name):
        customer = frappe.get_doc(
            {
                "doctype": "Customer",
                "customer_group": "_Test Customer Group",
                "customer_name": customer_name,
                "customer_type": "Individual",
                "territory": "_Test Territory",
                "is_internal_customer": 1,
                "represents_company": represents_company,
            }
        )

        customer.append("companies", {"company": allowed_to_interact_with})

        customer.insert()
        customer_name = customer.name
    else:
        customer_name = frappe.db.get_value("Customer", customer_name)

    return customer_name


def make_customer(customer_name):
    if not frappe.db.exists("Customer", customer_name):
        customer = frappe.new_doc("Customer")
        customer.customer_name = customer_name
        customer.customer_type = "Individual"
        customer.insert()
        return customer.name
    else:
        return customer_name
