import frappe
from frappe.utils import add_days, getdate, today

from erpnext.accounts.utils import get_fiscal_year
from erpnext.tests.utils import ERPNextTestSuite


class TestLowerDeductionCertificate(ERPNextTestSuite):
    """The certificate validates its date range and detects overlap with an existing
    certificate for the same supplier/category."""

    def make_ldc(self, valid_from, valid_upto, fiscal_year=None):
        doc = frappe.new_doc("Lower Deduction Certificate")
        doc.valid_from = valid_from
        doc.valid_upto = valid_upto
        doc.fiscal_year = fiscal_year
        return doc

    def dup(self, valid_from, valid_upto):
        return frappe._dict(valid_from=getdate(valid_from), valid_upto=getdate(valid_upto))

    def test_are_dates_overlapping(self):
        existing = self.dup("2026-03-01", "2026-06-30")

        self.assertTrue(self.make_ldc("2026-05-01", "2026-08-31").are_dates_overlapping(existing))
        self.assertTrue(self.make_ldc("2026-01-01", "2026-04-30").are_dates_overlapping(existing))
        self.assertTrue(self.make_ldc("2026-01-01", "2026-12-31").are_dates_overlapping(existing))
        self.assertFalse(self.make_ldc("2026-07-01", "2026-12-31").are_dates_overlapping(existing))

    def test_valid_upto_cannot_precede_valid_from(self):
        doc = self.make_ldc(valid_from="2026-06-30", valid_upto="2026-01-01")
        self.assertRaises(frappe.ValidationError, doc.validate_dates)

    def test_dates_must_fall_within_the_fiscal_year(self):
        fy_name, fy_start, fy_end = get_fiscal_year(today())
        self.make_ldc(fy_start, fy_end, fiscal_year=fy_name).validate_dates()
        before_fy = self.make_ldc(add_days(fy_start, -1), fy_end, fiscal_year=fy_name)
        self.assertRaises(frappe.ValidationError, before_fy.validate_dates)
