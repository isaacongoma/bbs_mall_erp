from datetime import date
from decimal import ROUND_HALF_UP, Decimal

PAYE_BANDS_MONTHLY = (
    (Decimal("24000"), Decimal("0.10")),
    (Decimal("32333"), Decimal("0.25")),
    (Decimal("500000"), Decimal("0.30")),
    (Decimal("800000"), Decimal("0.325")),
    (None, Decimal("0.35")),
)

PERSONAL_RELIEF_MONTHLY = Decimal("2400")
INSURANCE_RELIEF_RATE = Decimal("0.15")
INSURANCE_RELIEF_CAP_MONTHLY = Decimal("5000")
PENSION_DEDUCTION_CAP_MONTHLY = Decimal("30000")
MORTGAGE_INTEREST_CAP_MONTHLY = Decimal("30000")

NSSF_RATE = Decimal("0.06")
NSSF_SCHEDULE = (
    (date(2023, 2, 1), Decimal("6000"), Decimal("18000")),
    (date(2024, 2, 1), Decimal("7000"), Decimal("36000")),
    (date(2025, 2, 1), Decimal("8000"), Decimal("72000")),
    (date(2026, 2, 1), Decimal("9000"), Decimal("108000")),
)

SHIF_RATE = Decimal("0.0275")
SHIF_MINIMUM = Decimal("300")
HOUSING_LEVY_RATE = Decimal("0.015")
NITA_MONTHLY = Decimal("50")

PERIODS_PER_YEAR = {
    "Monthly": 12,
    "Fortnightly": 26,
    "Bimonthly": 24,
    "Weekly": 52,
    "Daily": 365,
}


def money(value):
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def as_decimal(value):
    return value if isinstance(value, Decimal) else Decimal(str(value or 0))


def nssf_limits(on_date):
    selected = None
    for effective_from, lower, upper in NSSF_SCHEDULE:
        if on_date >= effective_from:
            selected = (lower, upper)
    if selected is None:
        return NSSF_SCHEDULE[0][1], NSSF_SCHEDULE[0][2]
    return selected
