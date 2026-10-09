import frappe

page_title = "Partners"


def get_context(context):
    partners = frappe.get_all(
        "Sales Partner",
        filters={"show_in_website": 1},
        fields=["*"],
        order_by="name asc",
    )

    return {"partners": partners, "title": page_title}
