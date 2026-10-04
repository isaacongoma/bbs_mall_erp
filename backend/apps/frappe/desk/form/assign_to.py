import frappe
from frappe.utils import nowdate


def get(args=None):
    if not args:
        args = frappe.local.form_dict
    return frappe.get_all(
        "ToDo",
        fields=["allocated_to as owner", "name"],
        filters={
            "reference_type": args.get("doctype"),
            "reference_name": args.get("name"),
            "status": ("not in", ("Cancelled", "Closed")),
        },
        limit=5,
    )


def add(args=None, *, ignore_permissions=False):
    if not args:
        args = frappe.local.form_dict
    assign_to_users = args.get("assign_to")
    if isinstance(assign_to_users, str):
        assign_to_users = frappe.parse_json(assign_to_users)
    if not isinstance(assign_to_users, (list, tuple)):
        assign_to_users = [assign_to_users]
    created = []
    for user in assign_to_users:
        if not user:
            continue
        if "@" in str(user):
            from apps.core.models import User

            User.objects.get_or_create(
                email=user,
                defaults={"username": user.split("@", 1)[0], "first_name": user.split("@", 1)[0]},
            )
        filters = {
            "reference_type": args["doctype"],
            "reference_name": args["name"],
            "status": "Open",
            "allocated_to": user,
        }
        if not frappe.get_all("ToDo", filters=filters):
            d = frappe.get_doc(
                {
                    "doctype": "ToDo",
                    "allocated_to": user,
                    "reference_type": args["doctype"],
                    "reference_name": str(args["name"]),
                    "description": args.get("description", ""),
                    "priority": args.get("priority", "Medium"),
                    "status": "Open",
                    "date": args.get("date") or nowdate(),
                    "assigned_by": args.get("assigned_by") or frappe.session.user,
                }
            ).insert(ignore_permissions=True)
            created.append(d)
            if frappe.get_meta(args["doctype"]).get_field("assigned_to"):
                frappe.db.set_value(args["doctype"], args["name"], "assigned_to", user)
    return created


def close_all_assignments(doctype, name, ignore_permissions=False):
    assignments = frappe.get_all(
        "ToDo",
        fields=["allocated_to", "name"],
        filters={"reference_type": doctype, "reference_name": name, "status": ("not in", ["Cancelled", "Closed"])},
    )
    if not assignments:
        return False
    for assign_to in assignments:
        todo = frappe.get_doc("ToDo", assign_to.name)
        todo.status = "Closed"
        todo.save(ignore_permissions=True)
    if frappe.get_meta(doctype).get_field("assigned_to"):
        frappe.db.set_value(doctype, name, "assigned_to", None)
    return True


def clear(doctype, name, ignore_permissions=False):
    assignments = frappe.get_all(
        "ToDo",
        fields=["allocated_to", "name"],
        filters={"reference_type": doctype, "reference_name": name},
    )
    if not assignments:
        return False
    for assign_to in assignments:
        todo = frappe.get_doc("ToDo", assign_to.name)
        todo.status = "Cancelled"
        todo.save(ignore_permissions=True)
    if frappe.get_meta(doctype).get_field("assigned_to"):
        frappe.db.set_value(doctype, name, "assigned_to", None)
    return True


def remove(doctype, name, assign_to, ignore_permissions=False):
    todos = frappe.get_all(
        "ToDo",
        filters={
            "reference_type": doctype,
            "reference_name": name,
            "allocated_to": assign_to,
            "status": ("not in", ["Cancelled", "Closed"]),
        },
    )
    for row in todos:
        todo = frappe.get_doc("ToDo", row.name)
        todo.status = "Cancelled"
        todo.save(ignore_permissions=True)
    if frappe.get_meta(doctype).get_field("assigned_to"):
        frappe.db.set_value(doctype, name, "assigned_to", None)
    return True
