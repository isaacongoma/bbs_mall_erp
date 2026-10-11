import frappe


def check_app_permission():
    if frappe.session.user == "Administrator":
        return True
    roles = set(frappe.get_roles())
    return bool(roles & {"System Manager", "Marketplace Manager", "Marketplace Operations", "Marketplace Finance", "Catalog Moderator"})
