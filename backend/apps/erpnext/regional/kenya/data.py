KRA_PIN_PATTERN = r"^[AP]\d{9}[A-Z]$"

VAT_RATES = (
    ("Kenya VAT 16%", 16.0),
    ("Kenya VAT 8% Fuel", 8.0),
    ("Kenya VAT 0% Zero Rated", 0.0),
    ("Kenya VAT Exempt", 0.0),
)

TAX_CATEGORIES = ("Kenya VAT Standard", "Kenya VAT Zero Rated", "Kenya VAT Exempt", "Kenya VAT Fuel")

WITHHOLDING_EFFECTIVE_FROM = "2023-09-01"

WITHHOLDING_CATEGORIES = (
    ("Kenya WHT VAT 2%", 2.0, 24000.0),
    ("Kenya WHT Resident Management Professional Training Fees", 5.0, 24000.0),
    ("Kenya WHT Resident Contractual Fees", 3.0, 24000.0),
    ("Kenya WHT Resident Rent Immovable Property", 10.0, 0.0),
    ("Kenya WHT Resident Dividends", 5.0, 0.0),
    ("Kenya WHT Resident Interest", 15.0, 0.0),
    ("Kenya WHT Resident Royalties", 5.0, 0.0),
    ("Kenya WHT Non-Resident Management Professional Fees", 20.0, 0.0),
    ("Kenya WHT Non-Resident Rent", 30.0, 0.0),
    ("Kenya WHT Non-Resident Dividends", 15.0, 0.0),
    ("Kenya WHT Non-Resident Interest", 15.0, 0.0),
    ("Kenya WHT Non-Resident Royalties", 20.0, 0.0),
)
