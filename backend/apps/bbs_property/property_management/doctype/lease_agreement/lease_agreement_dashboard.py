def get_data():
    return {
        "fieldname": "lease",
        "non_standard_fieldnames": {"Journal Entry": "lease", "Lease Deposit": "lease"},
        "transactions": [
            {"label": "Billing", "items": ["Sales Invoice", "Lease Deposit", "Tenant Sales Declaration"]},
            {"label": "Operations", "items": ["Maintenance Request", "Meter Reading"]},
        ],
    }
