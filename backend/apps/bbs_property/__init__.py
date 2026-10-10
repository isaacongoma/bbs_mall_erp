import frappe


def check_app_permission():
    if frappe.session.user == "Administrator":
        return True
    roles = set(frappe.get_roles())
    return bool(roles & {"System Manager", "Property Manager", "Leasing Officer", "Property Accountant"})
