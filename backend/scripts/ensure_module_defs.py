import os

from django.conf import settings

import frappe


def run(app_name):
    path = os.path.join(settings.BASE_DIR, "apps", app_name, "modules.txt")
    created = []
    with open(path, encoding="utf8") as handle:
        modules = [line.strip() for line in handle if line.strip()]
    for module in modules:
        if frappe.db.exists("Module Def", module):
            continue
        frappe.get_doc({"doctype": "Module Def", "module_name": module, "app_name": app_name}).insert(ignore_permissions=True)
        created.append(module)
    frappe.db.commit()
    frappe.clear_cache()
    return created


if __name__ == "__main__":
    frappe.set_user("Administrator")
    print(run("hrms"))
