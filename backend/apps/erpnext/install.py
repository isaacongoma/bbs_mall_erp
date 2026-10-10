from django.db import transaction

import json

import frappe
from frappe.desk.page.setup_wizard.setup_wizard import make_records


SYSTEM_SETTINGS_DEFAULTS = {
    "language": "en",
    "time_zone": "Africa/Nairobi",
    "date_format": "dd-mm-yyyy",
    "number_format": "#,###.##",
    "first_day_of_the_week": "Monday",
}


def install_user_types():
    for user_type in ("System User", "Website User"):
        if not frappe.db.exists("User Type", user_type):
            frappe.get_doc({"doctype": "User Type", "name": user_type, "is_standard": 1, "role": ""}).insert(
                ignore_permissions=True, ignore_mandatory=True
            )


def install_system_settings_defaults():
    for fieldname, value in SYSTEM_SETTINGS_DEFAULTS.items():
        if not frappe.db.get_single_value("System Settings", fieldname):
            frappe.db.set_single_value("System Settings", fieldname, value)


STANDARD_ROLES = (
    "Administrator",
    "Guest",
    "All",
    "Desk User",
    "System Manager",
    "Report Manager",
    "Workspace Manager",
    "Script Manager",
    "Customer",
    "Supplier",
)

WEBSITE_USER_ROLES = ("Customer", "Supplier")


def vendor_permission_roles():
    import json
    from pathlib import Path

    from django.conf import settings

    roles = set()
    root = Path(settings.BASE_DIR).parent / "vendor"
    for path in root.glob("*/*/*/doctype/*/*.json"):
        try:
            meta = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if isinstance(meta, dict):
            for permission in meta.get("permissions", []):
                if permission.get("role"):
                    roles.add(permission["role"])
    return roles


def install_frappe_defaults():
    from frappe.utils.install import (
        add_standard_navbar_items,
        install_basic_docs,
        install_notification_templates,
        install_notification_types,
    )

    install_basic_docs()
    print_settings = frappe.get_doc("Print Settings")
    print_settings.save()
    frappe.get_doc("User", "Administrator").add_roles(*frappe.get_all("Role", pluck="name"))
    add_standard_navbar_items()
    if not frappe.db.get_default("desktop:home_page"):
        frappe.db.set_default("desktop:home_page", "workspace")
    install_notification_types()
    install_notification_templates()


def install_sequences():
    from django.db import connection

    from apps.erpnext.registry import _meta_by_doctype

    with connection.cursor() as cursor:
        for name, meta in _meta_by_doctype().items():
            if meta.get("autoname") == "autoincrement" and not meta.get("issingle") and not meta.get("is_virtual"):
                cursor.execute(
                    f'CREATE SEQUENCE IF NOT EXISTS "{frappe.scrub(name + "_id_seq")}" START WITH 1 INCREMENT BY 1'
                )


def install_roles():
    from apps.erpnext.registry import _meta_by_doctype

    names = set(STANDARD_ROLES)
    for meta in _meta_by_doctype().values():
        for permission in meta.get("permissions", []):
            if permission.get("role"):
                names.add(permission["role"])
    names |= vendor_permission_roles()
    existing = set(frappe.get_all("Role", pluck="name"))
    for name in sorted(names - existing):
        frappe.get_doc({"doctype": "Role", "role_name": name, "name": name, "desk_access": 0 if name in WEBSITE_USER_ROLES else 1}).insert(
            ignore_permissions=True, ignore_if_duplicate=True
        )


NON_COLUMN_FIELDTYPES = ("Section Break", "Column Break", "Tab Break", "Table", "Table MultiSelect", "HTML", "Button", "Heading")


def run_doctype_updates():
    import importlib

    from apps.erpnext.registry import _meta_by_doctype, get_controller

    for name, meta in sorted(_meta_by_doctype().items()):
        if meta.get("issingle") or meta.get("is_virtual"):
            continue
        try:
            controller = get_controller(name)
        except (KeyError, AttributeError, LookupError, ImportError):
            controller = None
        if controller is not None:
            update = getattr(importlib.import_module(controller.__module__), "on_doctype_update", None)
            if update is not None:
                update()
        for field in meta.get("fields", []):
            fieldname = field.get("fieldname")
            if not fieldname or field.get("fieldtype") in NON_COLUMN_FIELDTYPES:
                continue
            if field.get("search_index") and not field.get("unique") and frappe.db.has_column(name, fieldname):
                frappe.db.add_index(name, [fieldname])


def install_system_users():
    from apps.core.models import User

    for name, email, first_name in (
        ("Administrator", "admin@example.com", "Administrator"),
        ("Guest", "guest@example.com", "Guest"),
    ):
        if User.objects.filter(name=name).exists() or User.objects.filter(email=email).exists():
            continue
        user = User(
            name=name,
            username=name.lower(),
            email=email,
            first_name=first_name,
            is_active=True,
            is_staff=name == "Administrator",
            is_superuser=False,
            user_type="System User" if name == "Administrator" else "Website User",
        )
        user.set_unusable_password()
        user.save()


def install_base_fixtures(country="Kenya"):
    from erpnext.setup.setup_wizard.operations.install_fixtures import add_uom_data, get_preset_records
    from erpnext.stock import install_docs as stock_install_docs
    from erpnext.support import install_docs as support_install_docs

    previous_user = frappe.session.user
    frappe.session.user = "Administrator"
    try:
        frappe.flags.in_install = True
        with transaction.atomic():
            from frappe.geo.doctype.country.country import import_country_and_currency

            import_country_and_currency()
            from frappe.core.doctype.language.language import sync_languages

            sync_languages()
            module_records = [
                {"doctype": "Module Def", "module_name": module, "app_name": app, "name": module}
                for app in ("frappe", "erpnext")
                for module in frappe.local.app_modules.get(app, [])
            ]
            from apps.frappe.models import Series

            if not Series.objects.filter(name="__base_records_installed__").exists():
                make_records(module_records)
                make_records(list(stock_install_docs))
                make_records(list(support_install_docs))
                make_records(get_preset_records(country))
                add_uom_data()
                from erpnext.setup import install as erpnext_install

                for step in (
                    "set_single_defaults",
                    "setup_repost_defaults",
                    "create_marketing_campaign_custom_fields",
                    "create_address_and_contact_custom_fields",
                    "create_custom_company_links",
                ):
                    getattr(erpnext_install, step)()
                Series.objects.get_or_create(name="__base_records_installed__", defaults={"current": 1})
            from apps.frappe.modules.sync_artifacts import sync_artifacts

            sync_artifacts()
            from apps.core.crm_custom_fields import install_crm_custom_fields

            install_crm_custom_fields()
            run_doctype_updates()
            install_roles()
            install_sequences()
            install_user_types()
            frappe.db.set_global("installed_apps", json.dumps(["frappe", "erpnext", "hrms"]))
            install_system_users()
            install_system_settings_defaults()
            install_user_types()
            from apps.erpnext.regional.kenya.setup import setup as install_kenya

            install_kenya()
            if not Series.objects.filter(name="__hrms_installed__").exists():
                from hrms.install import after_install as install_hrms

                install_hrms()
                Series.objects.get_or_create(name="__hrms_installed__", defaults={"current": 1})
            if not Series.objects.filter(name="__bbs_property_installed__").exists():
                from apps.bbs_property import setup as install_property

                if not frappe.db.exists("Module Def", "Property Management"):
                    make_records([{"doctype": "Module Def", "module_name": "Property Management", "app_name": "bbs_property", "name": "Property Management"}])
                install_property.after_install()
                Series.objects.get_or_create(name="__bbs_property_installed__", defaults={"current": 1})
            if not Series.objects.filter(name="__frappe_after_install__").exists():
                install_frappe_defaults()
                Series.objects.get_or_create(name="__frappe_after_install__", defaults={"current": 1})
    finally:
        frappe.flags.in_install = False
        frappe.session.user = previous_user
