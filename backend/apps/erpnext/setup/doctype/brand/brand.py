import frappe
from frappe.model.document import Document


class Brand(Document):


    pass


def get_brand_defaults(item, company):
    item = frappe.get_cached_doc("Item", item)
    if item.brand:
        brand = frappe.get_cached_doc("Brand", item.brand)

        for d in brand.brand_defaults or []:
            if d.company == company:
                row = d.as_dict(no_private_properties=True)
                row.pop("name")
                return row

    return frappe._dict()
