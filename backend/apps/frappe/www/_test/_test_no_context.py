import frappe


def get_context():
    context = frappe._dict()
    context.body = "Custom Content"
    return context
