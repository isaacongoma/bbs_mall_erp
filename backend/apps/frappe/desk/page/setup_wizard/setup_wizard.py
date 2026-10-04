import traceback

import frappe
from frappe import _dict


def make_records(records, debug=False):
    from frappe.modules import scrub

    for record in records:
        doctype = record.get("doctype")
        condition = record.get("__condition")

        if condition and not condition():
            continue

        doc = frappe.new_doc(doctype)
        doc.update(record)

        parent_link_field = "parent_" + scrub(doc.doctype)
        if doc.meta.get_field(parent_link_field) and not doc.get(parent_link_field):
            doc.flags.ignore_mandatory = True

        savepoint = "setup_fixtures_creation"
        try:
            frappe.db.savepoint(savepoint)
            doc.insert(ignore_permissions=True, ignore_if_duplicate=True)
        except Exception as e:
            frappe.clear_last_message()
            frappe.db.rollback(save_point=savepoint)
            exception = record.get("__exception")
            if exception:
                config = _dict(exception)
                if isinstance(e, config.exception):
                    config.handler()
                else:
                    show_document_insert_error()
            else:
                show_document_insert_error()


def show_document_insert_error():
    print("Document Insert Error")
    print(traceback.format_exc())


def add_all_roles_to(name):
    from apps.frappe.models import HasRole, Role

    if name == "Administrator":
        return
    existing = set(HasRole.objects.filter(parent=name).values_list("role", flat=True))
    for role in Role.objects.exclude(name__in=["Administrator", "Guest", "All"]).values_list("name", flat=True):
        if role not in existing:
            HasRole.objects.create(name=frappe.generate_hash(length=10), parent=name, parentfield="roles", parenttype="User", role=role)
