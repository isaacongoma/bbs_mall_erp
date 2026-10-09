import frappe
from frappe.model.document import Document

APPS = "Apps"
DESKTOP_ICONS = "Desktop Icons"


class DesktopSettings(Document):
    _DOCTYPE_NAME = "Desktop Settings"


    def on_update(self):
        if not self.has_value_changed("desktop_page"):
            return

        frappe.clear_cache()

        if self.desktop_page == DESKTOP_ICONS:
            frappe.enqueue(seed_desktop_icons, enqueue_after_commit=True)


def seed_desktop_icons():
    """Fill a freshly switched-on grid: generated rows, then every app's shipped ones.

    This exists only while the flag has two settings; see `frappe/desk/RETIRING.md`.

    Both producers are idempotent, skipping an icon that already exists, so repeated switches
    accumulate nothing.
    """
    from frappe.desk.doctype.desktop_icon.desktop_icon import (
        create_desktop_icons,
        import_desktop_icon_fixtures,
    )

    create_desktop_icons()
    import_desktop_icon_fixtures()

    frappe.clear_cache()


def get_desktop_page() -> str:
    """Which page /app/desktop renders. Defaults to `Apps` when unset (fresh install)."""
    try:
        has_field = frappe.get_meta(DesktopSettings._DOCTYPE_NAME).has_field("desktop_page")
    except frappe.DoesNotExistError:
        frappe.clear_last_message()
        return APPS

    if not has_field:
        return APPS

    page = frappe.db.get_single_value(DesktopSettings._DOCTYPE_NAME, "desktop_page")
    return page if page in (APPS, DESKTOP_ICONS) else APPS


def is_desktop_icons_page() -> bool:
    """True when /app/desktop renders the arrangeable Desktop Icon grid."""
    return get_desktop_page() == DESKTOP_ICONS
