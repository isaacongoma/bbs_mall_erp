import frappe
from frappe.model.document import Document
from frappe.utils import today

exclude_from_linked_with = True


class LoyaltyPointEntry(Document):


    doctype = 'Loyalty Point Entry'

    pass


def get_loyalty_point_entries(customer, loyalty_program, company, expiry_date=None):
    if not expiry_date:
        expiry_date = today()

    return frappe.get_all(
        "Loyalty Point Entry",
        filters={
            "customer": customer,
            "loyalty_program": loyalty_program,
            "expiry_date": [">=", expiry_date],
            "loyalty_points": [">", 0],
            "company": company,
        },
        fields=["name", "loyalty_points", "expiry_date", "loyalty_program_tier", "invoice_type", "invoice"],
        order_by="expiry_date",
    )


def get_redemption_details(customer, loyalty_program, company):
    return frappe._dict(
        frappe.get_all(
            "Loyalty Point Entry",
            filters={
                "customer": customer,
                "loyalty_program": loyalty_program,
                "loyalty_points": ["<", 0],
                "company": company,
            },
            fields=["redeem_against", {"SUM": "loyalty_points", "as": "loyalty_points"}],
            group_by="redeem_against",
            as_list=True,
        )
    )
