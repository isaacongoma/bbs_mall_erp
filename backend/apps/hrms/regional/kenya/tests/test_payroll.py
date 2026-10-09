from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase

from apps.hrms.regional.kenya import payroll, rates


class TestPayeBands(SimpleTestCase):
    def test_zero_and_negative_pay(self):
        self.assertEqual(payroll.paye_before_relief(0), Decimal("0.00"))
        self.assertEqual(payroll.paye_before_relief(-500), Decimal("0.00"))

    def test_first_band_edge(self):
        self.assertEqual(payroll.paye_before_relief(24000), Decimal("2400.00"))
        self.assertEqual(payroll.paye_before_relief(24001), Decimal("2400.25"))

    def test_second_band_edge(self):
        self.assertEqual(payroll.paye_before_relief(32333), Decimal("4483.25"))
        self.assertEqual(payroll.paye_before_relief(32334), Decimal("4483.55"))

    def test_third_band_edge(self):
        self.assertEqual(payroll.paye_before_relief(500000), Decimal("144783.35"))
        self.assertEqual(payroll.paye_before_relief(500001), Decimal("144783.68"))

    def test_fourth_band_edge(self):
        self.assertEqual(payroll.paye_before_relief(800000), Decimal("242283.35"))
        self.assertEqual(payroll.paye_before_relief(800001), Decimal("242283.70"))

    def test_top_band(self):
        self.assertEqual(payroll.paye_before_relief(1000000), Decimal("312283.35"))


class TestNssf(SimpleTestCase):
    def test_limits_follow_effective_dates(self):
        self.assertEqual(rates.nssf_limits(date(2023, 1, 31)), (Decimal("6000"), Decimal("18000")))
        self.assertEqual(rates.nssf_limits(date(2024, 1, 31)), (Decimal("6000"), Decimal("18000")))
        self.assertEqual(rates.nssf_limits(date(2024, 2, 1)), (Decimal("7000"), Decimal("36000")))
        self.assertEqual(rates.nssf_limits(date(2025, 2, 1)), (Decimal("8000"), Decimal("72000")))
        self.assertEqual(rates.nssf_limits(date(2026, 1, 31)), (Decimal("8000"), Decimal("72000")))
        self.assertEqual(rates.nssf_limits(date(2026, 2, 1)), (Decimal("9000"), Decimal("108000")))

    def test_below_lower_earnings_limit(self):
        result = payroll.nssf_contribution(5000, date(2026, 3, 1))
        self.assertEqual(result["tier_one"], Decimal("300.00"))
        self.assertEqual(result["tier_two"], Decimal("0.00"))
        self.assertEqual(result["total"], Decimal("300.00"))

    def test_at_lower_earnings_limit(self):
        result = payroll.nssf_contribution(9000, date(2026, 3, 1))
        self.assertEqual(result["tier_one"], Decimal("540.00"))
        self.assertEqual(result["tier_two"], Decimal("0.00"))

    def test_just_above_lower_earnings_limit(self):
        result = payroll.nssf_contribution(9001, date(2026, 3, 1))
        self.assertEqual(result["tier_two"], Decimal("0.06"))
        self.assertEqual(result["total"], Decimal("540.06"))

    def test_at_upper_earnings_limit(self):
        result = payroll.nssf_contribution(108000, date(2026, 3, 1))
        self.assertEqual(result["tier_one"], Decimal("540.00"))
        self.assertEqual(result["tier_two"], Decimal("5940.00"))
        self.assertEqual(result["total"], Decimal("6480.00"))

    def test_above_upper_earnings_limit_is_capped(self):
        self.assertEqual(payroll.nssf_contribution(500000, date(2026, 3, 1))["total"], Decimal("6480.00"))

    def test_previous_year_schedule(self):
        self.assertEqual(payroll.nssf_contribution(72000, date(2025, 6, 1))["total"], Decimal("4320.00"))
        self.assertEqual(payroll.nssf_contribution(90000, date(2025, 6, 1))["total"], Decimal("4320.00"))

    def test_zero_pay(self):
        self.assertEqual(payroll.nssf_contribution(0, date(2026, 3, 1))["total"], Decimal("0.00"))


class TestShifAndHousingLevy(SimpleTestCase):
    def test_shif_minimum_applies_below_threshold(self):
        self.assertEqual(payroll.shif_contribution(10000), Decimal("300.00"))
        self.assertEqual(payroll.shif_contribution(10909), Decimal("300.00"))

    def test_shif_percentage_above_threshold(self):
        self.assertEqual(payroll.shif_contribution(10910), Decimal("300.03"))
        self.assertEqual(payroll.shif_contribution(100000), Decimal("2750.00"))

    def test_shif_zero_gross(self):
        self.assertEqual(payroll.shif_contribution(0), Decimal("0.00"))

    def test_housing_levy(self):
        self.assertEqual(payroll.housing_levy(100000), Decimal("1500.00"))
        self.assertEqual(payroll.housing_levy(0), Decimal("0.00"))

    def test_nita(self):
        self.assertEqual(payroll.nita_levy(), Decimal("50.00"))


class TestReliefs(SimpleTestCase):
    def test_insurance_relief_rate_and_cap(self):
        self.assertEqual(payroll.insurance_relief(10000), Decimal("1500.00"))
        self.assertEqual(payroll.insurance_relief(33333), Decimal("4999.95"))
        self.assertEqual(payroll.insurance_relief(33334), Decimal("5000.00"))
        self.assertEqual(payroll.insurance_relief(100000), Decimal("5000.00"))


class TestMonthlyComputation(SimpleTestCase):
    on_date = date(2026, 6, 30)

    def test_worked_example(self):
        result = payroll.compute_monthly(100000, self.on_date)
        self.assertEqual(result["nssf"], Decimal("6000.00"))
        self.assertEqual(result["shif"], Decimal("2750.00"))
        self.assertEqual(result["housing_levy"], Decimal("1500.00"))
        self.assertEqual(result["taxable_pay"], Decimal("89750.00"))
        self.assertEqual(result["tax_before_relief"], Decimal("21708.35"))
        self.assertEqual(result["paye"], Decimal("19308.35"))
        self.assertEqual(result["total_deductions"], Decimal("29558.35"))
        self.assertEqual(result["net_pay"], Decimal("70441.65"))

    def test_low_income_pays_no_paye_after_relief(self):
        result = payroll.compute_monthly(24000, self.on_date)
        expected = Decimal("24000") - result["nssf"] - result["shif"] - result["housing_levy"]
        self.assertEqual(result["taxable_pay"], expected)
        self.assertEqual(result["paye"], Decimal("0.00"))

    def test_paye_never_negative(self):
        self.assertEqual(payroll.compute_monthly(1000, self.on_date)["paye"], Decimal("0.00"))

    def test_zero_gross(self):
        result = payroll.compute_monthly(0, self.on_date)
        self.assertEqual(result["net_pay"], Decimal("0.00"))
        self.assertEqual(result["paye"], Decimal("0.00"))

    def test_without_personal_relief(self):
        with_relief = payroll.compute_monthly(100000, self.on_date)["paye"]
        without_relief = payroll.compute_monthly(100000, self.on_date, personal_relief=False)["paye"]
        self.assertEqual(without_relief - with_relief, Decimal("2400.00"))

    def test_insurance_relief_reduces_paye(self):
        base = payroll.compute_monthly(100000, self.on_date)["paye"]
        insured = payroll.compute_monthly(100000, self.on_date, insurance_premiums=20000)["paye"]
        self.assertEqual(base - insured, Decimal("3000.00"))

    def test_pension_contribution_is_deductible_up_to_cap(self):
        base = payroll.compute_monthly(200000, self.on_date)
        with_pension = payroll.compute_monthly(200000, self.on_date, pension_contribution=20000)
        self.assertEqual(base["taxable_pay"] - with_pension["taxable_pay"], Decimal("20000.00"))
        capped = payroll.compute_monthly(200000, self.on_date, pension_contribution=50000)
        self.assertEqual(base["taxable_pay"] - capped["taxable_pay"], Decimal("23520.00"))

    def test_mortgage_interest_cap(self):
        base = payroll.compute_monthly(200000, self.on_date)
        capped = payroll.compute_monthly(200000, self.on_date, mortgage_interest=45000)
        self.assertEqual(base["taxable_pay"] - capped["taxable_pay"], Decimal("30000.00"))

    def test_employer_side(self):
        result = payroll.compute_monthly(100000, self.on_date)
        self.assertEqual(result["employer_nssf"], Decimal("6000.00"))
        self.assertEqual(result["employer_housing_levy"], Decimal("1500.00"))
        self.assertEqual(result["employer_nita"], Decimal("50.00"))

    def test_nssf_schedule_changes_the_result(self):
        before = payroll.compute_monthly(100000, date(2026, 1, 31))["nssf"]
        after = payroll.compute_monthly(100000, date(2026, 2, 1))["nssf"]
        self.assertEqual(before, Decimal("4320.00"))
        self.assertEqual(after, Decimal("6000.00"))


class TestPeriodScaling(SimpleTestCase):
    def test_monthly_frequency_matches_monthly(self):
        self.assertEqual(
            payroll.compute_for_period(100000, "Monthly", date(2026, 6, 30)),
            payroll.compute_monthly(100000, date(2026, 6, 30)),
        )

    def test_weekly_pay_is_scaled_to_monthly_bands(self):
        weekly = payroll.compute_for_period(Decimal("23076.92"), "Weekly", date(2026, 6, 30))
        monthly = payroll.compute_monthly(Decimal("100000"), date(2026, 6, 30))
        scaled = float(weekly["paye"] * Decimal(52) / Decimal(12))
        self.assertAlmostEqual(scaled, float(monthly["paye"]), delta=1.0)
