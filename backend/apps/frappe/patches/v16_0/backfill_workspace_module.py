import click

import frappe

from frappe.desk.doctype.workspace.workspace import (
    CUSTOM_MODULE,
    PRIVATE_MODULE,
    ensure_module,
)


def execute():
    """Give every workspace without a module one, so `Workspace.module` can become mandatory.

    No guessing: a user's own page goes to `Private`, everything else to `Custom Workspaces`, a
    triage list a workspace manager sorts out later.
    """
    workspaces = frappe.get_all(
        "Workspace",
        filters={"module": ["in", ["", None]]},
        fields=["name", "for_user"],
    )
    if not workspaces:
        return

    buckets = {
        PRIVATE_MODULE: [w.name for w in workspaces if w.for_user],
        CUSTOM_MODULE: [w.name for w in workspaces if not w.for_user],
    }

    for module, names in buckets.items():
        if not names:
            continue

        ensure_module(module)
        frappe.db.set_value("Workspace", {"name": ["in", names]}, "module", module, update_modified=False)
        click.secho(f"  {len(names)} workspace(s) -> {module}", fg="green")
