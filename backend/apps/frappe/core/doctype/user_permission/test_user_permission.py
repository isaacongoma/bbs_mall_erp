import frappe


def create_user(email, *roles):
    from apps.core.models import User

    user, _ = User.objects.get_or_create(
        email=email,
        defaults={"username": email.split("@", 1)[0], "first_name": email.split("@", 1)[0]},
    )
    user.name = user.email
    if not roles:
        roles = ("System Manager",)
    for role in roles:
        if not frappe.db.exists("Role", role):
            try:
                frappe.get_doc({
                    "doctype": "Role",
                    "role_name": role,
                    "name": role,
                }).insert(ignore_permissions=True)
            except Exception:
                pass
        if not frappe.db.exists("Has Role", {"parent": user.name, "role": role}):
            frappe.get_doc(
                {
                    "doctype": "Has Role",
                    "parent": user.name,
                    "parenttype": "User",
                    "parentfield": "roles",
                    "role": role,
                }
            ).insert(ignore_permissions=True)
    return user
