import frappe

RENAMES = [
    ("Website", "website", "app-window"),
    ("Integrations", "integration", "cable"),
]


def execute():
    Workspace = frappe.qb.DocType("Workspace")

    for name, old_icon, new_icon in RENAMES:
        frappe.qb.update(Workspace).set(Workspace.icon, new_icon).where(
            (Workspace.name == name) & (Workspace.icon == old_icon)
        ).run()
