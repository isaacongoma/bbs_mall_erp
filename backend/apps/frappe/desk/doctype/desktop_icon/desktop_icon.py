"""The icon grid's rows: what a site sees when its desktop page is the grid.

This is being retired. It goes with the icon-grid batch, on one of the two triggers listed in
`frappe/desk/RETIRING.md`, not on a date and not on its own.
"""
from __future__ import annotations

import json
import os
import random

import frappe
from frappe import _
from frappe.desk.doctype.desktop_settings.desktop_settings import is_desktop_icons_page
from frappe.model.document import Document
from frappe.modules.export_file import strip_default_fields
from frappe.modules.import_file import import_file_by_path
from frappe.modules.utils import create_directory_on_app_path, get_app_level_files


class DesktopIcon(Document):
    doctype = 'Desktop Icon'

    _DOCTYPE_NAME = "Desktop Icon"


    def validate(self):
        if not self.label:
            self.label = self.module_name

    def on_trash(self):
        clear_desktop_icons_cache()
        if frappe.conf.developer_mode and self.standard and self.app:
            delete_desktop_icon_file(self.app, self.label)

    def check_for_restrict_removal(self):
        """Refuse to remove an icon the grid marks as fixed.

        Nothing calls this, on purpose. `restrict_removal` still means what it always did: it
        hides the remove control in the grid's edit mode. Calling this from deletion would make a
        workspace that deletes fine today start throwing. It stays because it is still correct for
        a caller that is genuinely removing an icon from the grid.
        """
        if self.restrict_removal:
            frappe.throw(_("Cannot delete Desktop Icon '{0}' as it is restricted").format(self.label))

    def on_update(self):
        self.export_desktop_icon()
        if self.standard:
            frappe.cache.delete_key("desktop_icons")
            frappe.cache.delete_key("bootinfo")
        else:
            clear_desktop_icons_cache(user=self.owner)

    def after_rename(self, old, new, merge):
        delete_desktop_icon_file(self.app, old)
        self.export_desktop_icon()

    def export_desktop_icon(self):
        allow_export = (
            self.standard and self.app and not frappe.flags.in_import and frappe.conf.developer_mode
        )
        if allow_export:
            folder_path = create_directory_on_app_path("desktop_icon", self.app)
            file_path = os.path.join(folder_path, f"{frappe.scrub(self.label)}.json")
            doc_export = self.as_dict(no_nulls=True, no_private_properties=True)
            strip_default_fields(self, doc_export)
            with open(file_path, "w+") as icon_file_doc:
                icon_file_doc.write(frappe.as_json(doc_export) + "\n")

    def delete_desktop_icon_file(self):
        folder_path = create_directory_on_app_path("desktop_icon", self.app)
        file_path = os.path.join(folder_path, f"{frappe.scrub(self.label)}.json")
        if os.path.exists(file_path):
            os.remove(file_path)


    def after_insert(self):
        clear_desktop_icons_cache()


def delete_desktop_icon_file(app, label):
    folder_path = create_directory_on_app_path("desktop_icon", app)
    file_path = os.path.join(folder_path, f"{frappe.scrub(label)}.json")
    if os.path.exists(file_path):
        os.remove(file_path)


def get_workspace_names(workspaces):
    workspace_list = []
    for w in workspaces["pages"]:
        workspace_list.append(w["name"])
    return workspace_list


def is_icon_permitted(icon, bootinfo, roles: list[str], icon_module: str | None) -> bool:
    """Return whether `icon` belongs on this user's desktop.

    It takes a plain icon row rather than a Document, plus the two things the check needs: the
    icon's `Has Role` rows and, for a workspace link, that workspace's module. That lets
    `get_desktop_icons` fetch both for the whole grid in one query each instead of loading every
    icon to reach them.
    """
    from frappe.desk.doctype.sidebar.sidebar import sidebar_for_module
    from frappe.utils.modules import is_module_visible

    if icon_module and not is_module_visible(icon_module):
        return False

    if roles and not set(roles).intersection(frappe.get_roles()):
        return False

    if icon.icon_type == "Folder":
        return True
    elif icon.icon_type == "App":
        return _has_app_permission(icon)
    else:
        sidebar = sidebar_for_module(bootinfo.module_sidebars or {}, icon_module or icon.label)
        return bool(sidebar)


def _has_app_permission(icon) -> bool:
    for a in frappe.get_active_apps():
        app_title = (frappe.get_hooks("app_title", app_name=a) or [None])[0]
        if app_title == icon.label or icon.app == a:
            app_detail = frappe.get_hooks("add_to_apps_screen", app_name=a)
            if len(app_detail) != 0:
                permission_method = app_detail[0].get("has_permission", None)
                if permission_method:
                    return frappe.get_attr(permission_method)()
                else:
                    return True
            else:
                return True

    return False


def get_roles_by_icon(icons: list[dict]) -> dict[str, list[str]]:
    """Return the `Has Role` rows of `icons`, as icon name to the roles it is restricted to."""
    if not icons:
        return {}

    roles_by_icon = {}
    for row in frappe.get_all(
        "Has Role",
        filters={"parenttype": "Desktop Icon", "parent": ("in", [icon.name for icon in icons])},
        fields=["parent", "role"],
    ):
        roles_by_icon.setdefault(row.parent, []).append(row.role)

    return roles_by_icon


def get_linked_workspace_modules(icons: list[dict]) -> dict[str, str]:
    """Return the module of the workspace each icon links to, as icon name to module.

    Only a `Link` icon resolves a workspace, so nothing else gets a module. An icon of another
    type whose `link_to` happens to name a workspace is left alone, as it was when this was looked
    up per icon.
    """
    linked = {icon.name: icon.link_to for icon in icons if icon.icon_type == "Link" and icon.link_to}
    if not linked:
        return {}

    modules = dict(
        frappe.get_all(
            "Workspace",
            filters={"name": ("in", list(set(linked.values())))},
            fields=["name", "module"],
            as_list=True,
        )
    )

    return {name: modules.get(workspace) for name, workspace in linked.items()}


def get_desktop_icons(user=None, bootinfo=None):
    """Return desktop icons for user"""
    if not user:
        user = frappe.session.user

    user_icons = frappe.cache.hget("desktop_icons", user)

    if not user_icons:
        fields = [
            "label",
            "bg_color",
            "link",
            "link_type",
            "app",
            "icon_type",
            "parent_icon",
            "icon",
            "link_to",
            "idx",
            "standard",
            "logo_url",
            "hidden",
            "name",
            "restrict_removal",
            "icon_image",
        ]

        from frappe.query_builder import DocType

        DesktopIcon = DocType("Desktop Icon")

        user_icons = (
            frappe.qb.from_(DesktopIcon)
            .select(*fields)
            .where(
                (DesktopIcon.standard == 1)
                | (
                    (DesktopIcon.standard == 0)
                    & (DesktopIcon.owner.isin(["Administrator", frappe.session.user]))
                )
            )
            .distinct()
        ).run(as_dict=True)

        user_icons.sort(key=lambda a: a.idx)

        permitted_icons = []
        permitted_parent_labels = set()
        if bootinfo:
            roles_by_icon = get_roles_by_icon(user_icons)
            modules_by_icon = get_linked_workspace_modules(user_icons)

            for s in user_icons:
                icon_module = modules_by_icon.get(s.name)
                if is_icon_permitted(
                    s,
                    bootinfo,
                    roles=roles_by_icon.get(s.name, []),
                    icon_module=icon_module,
                ):
                    s.module = icon_module
                    permitted_icons.append(s)

                    if not s.parent_icon:
                        permitted_parent_labels.add(s.label)

        user_icons = [
            s for s in permitted_icons if not s.parent_icon or s.parent_icon in permitted_parent_labels
        ]

        frappe.cache.hset("desktop_icons", user, user_icons)
    return user_icons


def clear_desktop_icons_cache(user=None):
    frappe.cache.hdel("desktop_icons", user or frappe.session.user)
    frappe.cache.hdel("bootinfo", user or frappe.session.user)


def create_desktop_icons_from_workspace():
    workspaces = frappe.get_all(
        "Workspace",
        filters={"public": 1},
        fields=["name", "icon", "module"],
    )

    for w in workspaces:
        icon = frappe.new_doc("Desktop Icon")
        icon.link_type = "Workspace Sidebar"
        icon.label = w.name
        icon.icon_type = "Link"
        icon.link_to = w.name
        icon.icon = w.icon
        if w.module:
            app_name = frappe.db.get_value("Module Def", w.module, "app_name")
            if app_name in frappe.get_installed_apps():
                icon.app = app_name
                app_title = (frappe.get_hooks("app_title", app_name=app_name) or [None])[0]
                app_icon = (
                    frappe.db.exists("Desktop Icon", {"label": app_title, "icon_type": "App"})
                    if app_title
                    else None
                )
                if app_icon:
                    icon.parent_icon = app_icon

                app_link = frappe.db.get_value("Desktop Icon", app_icon, "link") if app_icon else None

                if app_link and not app_link.startswith("/app"):
                    icon.hidden = 1
                    icon.parent_icon = None

                if icon.label == app_title and app_link and app_link.startswith("/app"):
                    icon.hidden = 1
                    icon.parent_icon = None

                try:
                    if not frappe.db.exists(
                        "Desktop Icon", [{"label": icon.label, "icon_type": icon.icon_type}]
                    ):
                        icon.insert(ignore_if_duplicate=True, ignore_links=True)
                except Exception:
                    frappe.log_error("Creation of Desktop Icon Failed")


def create_desktop_icons_from_installed_apps():
    apps = frappe.get_installed_apps()
    index = 0
    for a in apps:
        app_title = (frappe.get_hooks("app_title", app_name=a) or [None])[0]
        if not app_title:
            continue

        app_details = frappe.get_hooks("add_to_apps_screen", app_name=a)
        if not frappe.db.exists("Desktop Icon", [{"icon_type": "App"}, {"app": a}]):
            if len(app_details) != 0:
                icon = frappe.new_doc("Desktop Icon")
                icon.label = app_title
                icon.link_type = "External"
                icon.idx = index
                icon.icon_type = "App"
                icon.app = a
                icon.link = app_details[0]["route"]
                icon.logo_url = app_details[0]["logo"]
                if not frappe.db.exists("Desktop Icon", [{"label": icon.label, "icon_type": icon.icon_type}]):
                    icon.save()
                index += 1


def create_desktop_icons():
    """Seed Desktop Icons for the Desktop Icon grid.

    The guard is here rather than in the readers: a site whose desktop page is `Apps` draws that
    screen from the `add_to_apps_screen` hook and never reads these rows, so generating them on
    every app install would only accumulate unused data.
    """
    if not is_desktop_icons_page():
        return

    create_desktop_icons_from_installed_apps()
    create_desktop_icons_from_workspace()


def import_desktop_icon_fixtures(app: str | None = None, force: bool = False):
    """Import the icon rows `app`, or every installed app, ships in its `desktop_icon/`.

    It carries the same guard as the generator, so an Apps-mode site holds no icon rows at all,
    generated or shipped, and the retiring surface cannot contradict the module-first model.
    Switching to the grid is what imports them.
    """
    if not is_desktop_icons_page():
        return

    for app_name in [app] if app else frappe.get_installed_apps():
        for doc_path in get_app_level_files("desktop_icon", app_name):
            if import_file_by_path(doc_path, force=force, ignore_version=True):
                frappe.db.commit(chain=True)


def create_user_icons(user, data):
    user_settings = json.loads(data)
    new_icons = user_settings.get("icons_to_create")
    if new_icons:
        new_icons = json.loads(user_settings.get("icons_to_create"))
        if new_icons:
            for icon in new_icons:
                try:
                    desktop_icon = frappe.new_doc("Desktop Icon")
                    desktop_icon.update(icon)
                    desktop_icon.owner = user
                    desktop_icon.save()
                except Exception as e:
                    frappe.log_error("Error in syncing icons", e)
            user_settings.pop("icons_to_create", None)
            frappe.cache.hset("_user_settings", f"{'Desktop Icon'}::{user}", json.dumps(user_settings))
            return json.dumps(user_settings)
    return data


@frappe.whitelist()
def add_workspace_to_desktop(workspace: str):
    """Give `workspace` an icon on the grid.

    It used to also create a `Workspace Sidebar` to hold the link. That doctype is now an inert
    archive that the sidebar migration reads as its source, so writing new rows to it would change
    the conversion's input. The grid never needed one anyway: the icon resolves its route through
    the module-keyed sidebar payload.
    """
    new_icon = frappe.new_doc("Desktop Icon")
    new_icon.label = workspace
    new_icon.icon_type = "Link"
    new_icon.link_to = workspace
    new_icon.link_type = "Workspace Sidebar"
    new_icon.insert(ignore_links=True)
    return {"icon": new_icon.as_dict()}
