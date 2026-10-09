from frappe import _


def get_data():
    return {
        "fieldname": "stock_entry",
        "non_standard_fieldnames": {
            "Stock Reservation Entry": "from_voucher_no",
        },
        "transactions": [
            {"label": _("Stock Reservation"), "items": ["Stock Reservation Entry"]},
        ],
    }
