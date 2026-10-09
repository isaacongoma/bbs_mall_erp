from __future__ import annotations
"""One user's arrangement of the icon grid.

Retiring. It goes with the icon-grid batch, on one of the two triggers written down in
`frappe/desk/RETIRING.md` -- not on a date, and not on its own.
"""

import json

import frappe
from frappe.desk.doctype.desktop_icon.desktop_icon import add_workspace_to_desktop
from frappe.desk.doctype.workspace.workspace import triage_module
from frappe.model.document import Document


class DesktopLayout(Document):
    doctype = 'Desktop Layout'

    _DOCTYPE_NAME = "Desktop Layout"


    pass


@frappe.whitelist()
def save_layout(user: str, layout: str, new_icons: str | None = None):
    if not user:
        user = frappe.session.user
    layout = json.loads(layout)
    desktop_layout = None
    try:
        desktop_layout = frappe.get_doc("Desktop Layout", frappe.session.user)
    except frappe.DoesNotExistError:
        frappe.clear_last_message()
        desktop_layout = frappe.new_doc("Desktop Layout")
        desktop_layout.user = frappe.session.user

    if layout:
        desktop_layout.layout = json.dumps(layout)
        desktop_layout.save()
    if new_icons:
        new_icons = json.loads(new_icons)
        for icon in new_icons:
            workspace = icon.get("workspace")
            if workspace:
                new_workspace = frappe.new_doc("Workspace")
                new_workspace.update(workspace)
                new_workspace.title = new_workspace.label
                if not new_workspace.module:
                    new_workspace.module = triage_module(new_workspace.for_user)
                new_workspace.save()
                add_workspace_to_desktop(new_workspace.name)
                continue
            desktop_icon = frappe.new_doc("Desktop Icon")
            desktop_icon.update(icon)
            desktop_icon.owner = frappe.session.user
            desktop_icon.save()

    return {"layout": layout}


@frappe.whitelist()
def delete_layout():
    return frappe.delete_doc_if_exists("Desktop Layout", frappe.session.user)
