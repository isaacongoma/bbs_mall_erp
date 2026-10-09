from django.test import TestCase
from django.db import transaction
from unittest.mock import patch

import frappe
from apps.erpnext.accounts.doctype.fiscal_year.fiscal_year import auto_create_fiscal_year, get_from_and_to_date
from apps.frappe.utils import getdate
from apps.frappe.utils import add_days


class FiscalYearControllerTests(TestCase):
    def test_extra_year_is_rejected(self):
        fiscal_year = frappe.get_doc(
            {
                "doctype": "Fiscal Year",
                "year": "_Test Fiscal Year 2000",
                "year_end_date": "2002-12-31",
                "year_start_date": "2000-04-01",
            }
        )

        with self.assertRaises(frappe.exceptions.InvalidDates):
            fiscal_year.insert()

    def test_company_fiscal_year_overlap_matches_upstream_case(self):
        global_fy = frappe.new_doc("Fiscal Year")
        global_fy.year = "_Test Global FY 2001"
        global_fy.year_start_date = "2201-04-01"
        global_fy.year_end_date = "2202-03-31"
        global_fy.insert()

        company_fy = frappe.new_doc("Fiscal Year")
        company_fy.year = "_Test Company FY 2001"
        company_fy.year_start_date = "2201-01-01"
        company_fy.year_end_date = "2201-12-31"
        company_fy.append("companies", {"company": "_Test Company"})

        company_fy.insert()
        self.assertTrue(frappe.db.exists("Fiscal Year", global_fy.name))
        self.assertTrue(frappe.db.exists("Fiscal Year", company_fy.name))

    def test_global_fiscal_year_overlap_is_rejected(self):
        first = frappe.new_doc("Fiscal Year")
        first.year = "_Test Global FY 2020"
        first.year_start_date = "2220-01-01"
        first.year_end_date = "2220-12-31"
        first.insert()

        second = frappe.new_doc("Fiscal Year")
        second.year = "_Test Overlap FY 2020"
        second.year_start_date = "2220-04-01"
        second.year_end_date = "2221-03-31"

        with self.assertRaises(frappe.NameError):
            second.insert()

    def test_get_from_and_to_date(self):
        fiscal_year = frappe.new_doc("Fiscal Year")
        fiscal_year.year = "_Test Lookup FY 2030"
        fiscal_year.year_start_date = "2230-01-01"
        fiscal_year.year_end_date = "2230-12-31"
        fiscal_year.insert()

        self.assertEqual(
            get_from_and_to_date(fiscal_year.name),
            {"from_date": getdate(fiscal_year.year_start_date), "to_date": getdate(fiscal_year.year_end_date)},
        )

    def test_auto_create_fiscal_year_rolls_back_only_to_savepoint(self):
        follow_up_date = add_days(getdate(), 3)
        start_date = add_days(follow_up_date, -364)
        frappe.db.delete("Fiscal Year Company")
        frappe.db.delete("Fiscal Year")

        first = frappe.new_doc("Fiscal Year")
        first.year = "_Test Auto First"
        first.year_start_date = start_date
        first.year_end_date = follow_up_date
        first.insert()

        second = frappe.new_doc("Fiscal Year")
        second.year = "_Test Auto Second"
        second.year_start_date = start_date
        second.year_end_date = follow_up_date
        second.append("companies", {"company": "_Test Company"})
        second.insert()

        original_new_doc = frappe.new_doc
        call_count = {"count": 0}

        def new_doc_with_first_insert_failure(doctype, **kwargs):
            doc = original_new_doc(doctype, **kwargs)
            call_count["count"] += 1
            if call_count["count"] == 1:
                doc.insert = lambda *args, **kwargs: (_ for _ in ()).throw(frappe.NameError("duplicate"))
            return doc

        with patch("apps.erpnext.accounts.doctype.fiscal_year.fiscal_year.frappe.new_doc", new_doc_with_first_insert_failure):
            with transaction.atomic():
                auto_create_fiscal_year()

        expected_year = (
            str(add_days(second.year_end_date, 1).year)
            if add_days(second.year_end_date, 1).year == add_days(second.year_end_date, 365).year
            else f"{add_days(second.year_end_date, 1).year}-{add_days(second.year_end_date, 365).year}"
        )
        self.assertTrue(frappe.db.exists("Fiscal Year", expected_year))
