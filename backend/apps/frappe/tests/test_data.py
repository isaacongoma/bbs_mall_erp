from django.test import SimpleTestCase

from apps.frappe.utils import cast, cint, comma_and, evaluate_filters, flt, rounded


class DataUtilsTests(SimpleTestCase):
    databases = {"default"}

    def test_flt_parses_strings_and_ignores_invalid_input(self):
        self.assertEqual(flt(None), 0)
        self.assertEqual(flt("what"), 0)
        self.assertEqual(flt("0.3"), 0.3)
        self.assertEqual(flt("1,500.5", 2), 1500.5)

    def test_flt_default_rounding_matches_erpnext_oracle(self):
        self.assertEqual(flt(2.675, 2), 2.68)
        self.assertEqual(flt(1.005, 2), 1.0)
        self.assertEqual(flt(0.285, 2), 0.28)
        self.assertEqual(flt(-2.675, 2), -2.68)
        self.assertEqual(flt(2.665, 2), 2.66)
        self.assertEqual(flt(0.125, 2), 0.12)
        self.assertEqual(flt(0.135, 2), 0.14)

    def test_commercial_rounding_examples(self):
        method = "Commercial Rounding"
        self.assertEqual(flt("0.5", 0, rounding_method=method), 1)
        self.assertEqual(flt(2.5, 0, rounding_method=method), 3)
        self.assertEqual(flt(-0.5, 0, rounding_method=method), -1)
        self.assertEqual(flt(2.675, 2, rounding_method=method), 2.68)

    def test_bankers_rounding_examples(self):
        method = "Banker's Rounding"
        self.assertEqual(rounded(0, 0, rounding_method=method), 0)
        self.assertEqual(rounded(5.551115123125783e-17, 2, rounding_method=method), 0.0)
        self.assertEqual(flt("0.5", 0, rounding_method=method), 0)
        self.assertEqual(flt(2.5, 0, rounding_method=method), 2)
        self.assertEqual(flt(-0.5, 0, rounding_method=method), 0)
        self.assertEqual(flt(2.675, 2, rounding_method=method), 2.68)

    def test_rounded_uses_flt_rounding(self):
        self.assertEqual(rounded(2.675, 2), 2.68)
        self.assertEqual(rounded(1.005, 2), 1.0)
        self.assertEqual(rounded(0.125, 2), 0.12)
        self.assertEqual(rounded(0.5), 0)
        self.assertEqual(rounded(1.5), 2)
        self.assertEqual(rounded(2.5), 2)
        self.assertEqual(rounded(3.5), 4)
        self.assertEqual(rounded(-2.5), -2)

    def test_cint(self):
        self.assertEqual(cint("100"), 100)
        self.assertEqual(cint("a"), 0)
        self.assertEqual(cint(None), 0)

    def test_cast_core_fieldtypes(self):
        self.assertIsInstance(cast("Data", value=None), str)
        self.assertIsInstance(cast("Float", value=1.12), float)
        self.assertIsInstance(cast("Int", value=1.12), int)

    def test_comma_and(self):
        self.assertEqual(comma_and(["a", "b", "c"]), "'a', 'b', and 'c'")
        self.assertEqual(comma_and(["a", "b", "c"], add_quotes=False), "a, b, and c")

    def test_evaluate_filters(self):
        doc = {"doctype": "User", "status": "Open", "name": "Test 1", "age": 20}
        self.assertTrue(evaluate_filters(doc, {"status": "Open"}))
        self.assertFalse(evaluate_filters(doc, {"status": "Closed"}))
        self.assertTrue(evaluate_filters(doc, [["status", "=", "Open"], ["name", "=", "Test 1"]]))
        self.assertFalse(evaluate_filters(doc, [["status", "=", "Open"], ["name", "=", "Test 2"]]))
        self.assertTrue(evaluate_filters(doc, {"age": (">", 10)}))
        self.assertFalse(evaluate_filters(doc, {"age": (">", 30)}))
