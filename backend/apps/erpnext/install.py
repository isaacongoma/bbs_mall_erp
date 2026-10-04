from django.db import transaction

import frappe
from frappe.desk.page.setup_wizard.setup_wizard import make_records


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
            module_records = [
                {"doctype": "Module Def", "module_name": module, "app_name": app, "name": module}
                for app in ("frappe", "erpnext")
                for module in frappe.local.app_modules.get(app, [])
            ]
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
    finally:
        frappe.flags.in_install = False
        frappe.session.user = previous_user
