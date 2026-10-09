from datetime import date
from decimal import Decimal

from apps.hrms.regional.kenya import rates
from apps.hrms.regional.kenya.rates import as_decimal, money


def paye_before_relief(taxable_pay):
    remaining = max(as_decimal(taxable_pay), Decimal("0"))
    tax = Decimal("0")
    previous_limit = Decimal("0")
    for limit, rate in rates.PAYE_BANDS_MONTHLY:
        if limit is None:
            tax += remaining * rate
            break
        band = min(remaining, limit - previous_limit)
        if band <= 0:
            break
        tax += band * rate
        remaining -= band
        previous_limit = limit
    return money(tax)


def nssf_contribution(pensionable_pay, on_date=None):
    on_date = on_date or date.today()
    lower, upper = rates.nssf_limits(on_date)
    pay = max(as_decimal(pensionable_pay), Decimal("0"))
    tier_one = min(pay, lower) * rates.NSSF_RATE
    tier_two = max(min(pay, upper) - lower, Decimal("0")) * rates.NSSF_RATE
    return {
        "tier_one": money(tier_one),
        "tier_two": money(tier_two),
        "total": money(tier_one + tier_two),
        "lower_earnings_limit": lower,
        "upper_earnings_limit": upper,
    }


def shif_contribution(gross_pay):
    gross = max(as_decimal(gross_pay), Decimal("0"))
    if gross == 0:
        return money(0)
    return money(max(gross * rates.SHIF_RATE, rates.SHIF_MINIMUM))


def housing_levy(gross_pay):
    return money(max(as_decimal(gross_pay), Decimal("0")) * rates.HOUSING_LEVY_RATE)


def nita_levy(gross_pay=None):
    return money(rates.NITA_MONTHLY)


def insurance_relief(premiums):
    relief = max(as_decimal(premiums), Decimal("0")) * rates.INSURANCE_RELIEF_RATE
    return money(min(relief, rates.INSURANCE_RELIEF_CAP_MONTHLY))


def compute_monthly(
    gross_pay,
    on_date=None,
    pension_contribution=0,
    mortgage_interest=0,
    insurance_premiums=0,
    other_taxable_deductions=0,
    personal_relief=True,
):
    gross = as_decimal(gross_pay)
    nssf = nssf_contribution(gross, on_date)
    shif = shif_contribution(gross)
    levy = housing_levy(gross)
    pension = min(max(as_decimal(pension_contribution), Decimal("0")), rates.PENSION_DEDUCTION_CAP_MONTHLY)
    mortgage = min(max(as_decimal(mortgage_interest), Decimal("0")), rates.MORTGAGE_INTEREST_CAP_MONTHLY)
    pension_and_nssf = min(nssf["total"] + pension, rates.PENSION_DEDUCTION_CAP_MONTHLY)
    taxable = max(
        gross - pension_and_nssf - shif - levy - mortgage - as_decimal(other_taxable_deductions),
        Decimal("0"),
    )
    gross_tax = paye_before_relief(taxable)
    reliefs = insurance_relief(insurance_premiums)
    if personal_relief:
        reliefs += rates.PERSONAL_RELIEF_MONTHLY
    paye = money(max(gross_tax - reliefs, Decimal("0")))
    return {
        "gross_pay": money(gross),
        "nssf": nssf["total"],
        "nssf_tier_one": nssf["tier_one"],
        "nssf_tier_two": nssf["tier_two"],
        "shif": shif,
        "housing_levy": levy,
        "taxable_pay": money(taxable),
        "tax_before_relief": gross_tax,
        "reliefs": money(reliefs),
        "paye": paye,
        "total_deductions": money(nssf["total"] + shif + levy + paye),
        "net_pay": money(gross - nssf["total"] - shif - levy - paye),
        "employer_nssf": nssf["total"],
        "employer_housing_levy": levy,
        "employer_nita": nita_levy(),
    }


def compute_for_period(
    gross_pay,
    payroll_frequency="Monthly",
    on_date=None,
    pension_contribution=0,
    mortgage_interest=0,
    insurance_premiums=0,
    other_taxable_deductions=0,
    personal_relief=True,
):
    periods_per_month = Decimal(rates.PERIODS_PER_YEAR.get(payroll_frequency or "Monthly", 12)) / Decimal(12)

    def monthly(value):
        return as_decimal(value) * periods_per_month

    result = compute_monthly(
        monthly(gross_pay),
        on_date=on_date,
        pension_contribution=monthly(pension_contribution),
        mortgage_interest=monthly(mortgage_interest),
        insurance_premiums=monthly(insurance_premiums),
        other_taxable_deductions=monthly(other_taxable_deductions),
        personal_relief=personal_relief,
    )
    return {key: money(value / periods_per_month) for key, value in result.items()}
