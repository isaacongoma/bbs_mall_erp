import frappe
from frappe import _
from frappe.custom.doctype.property_setter.property_setter import make_property_setter
from frappe.model.document import Document
from frappe.utils import cint

UTM_DOCTYPES = [
    "Lead",
    "Quotation",
    "POS Invoice",
    "POS Profile",
    "Opportunity",
    "Sales Order",
    "Sales Invoice",
    "Delivery Note",
]


class SellingSettings(Document):


    doctype = 'Selling Settings'

    def on_update(self):
        self.toggle_hide_tax_id()
        self.toggle_editable_rate_for_bundle_items()
        self.toggle_discount_accounting_fields()

    def validate(self):
        old_doc = self.get_doc_before_save()

        for key in [
            "cust_master_name",
            "customer_group",
            "territory",
            "maintain_same_sales_rate",
            "editable_price_list_rate",
            "selling_price_list",
        ]:
            frappe.db.set_default(key, self.get(key, ""))

        self.update_customer_naming_settings()

        self.validate_fallback_to_default_price_list()

        if old_doc and old_doc.enable_tracking_sales_commissions != self.enable_tracking_sales_commissions:
            toggle_tracking_sales_commissions_section(not self.enable_tracking_sales_commissions)

        if old_doc and old_doc.enable_utm != self.enable_utm:
            toggle_utm_analytics_section(not self.enable_utm)

    def update_customer_naming_settings(self):
        if not self.has_value_changed("cust_master_name"):
            return

        from erpnext.utilities.naming import set_by_naming_series

        set_by_naming_series(
            "Customer",
            "customer_name",
            self.get("cust_master_name") == "Naming Series",
            hide_name_field=False,
        )

    def validate_fallback_to_default_price_list(self):
        if (
            self.fallback_to_default_price_list
            and self.has_value_changed("fallback_to_default_price_list")
            and frappe.get_single_value("Stock Settings", "auto_insert_price_list_rate_if_missing")
        ):
            stock_meta = frappe.get_meta("Stock Settings")
            frappe.msgprint(
                _(
                    "You have enabled {0} and {1} in {2}. This can lead to prices from the default price list being inserted into the transaction price list."
                ).format(
                    "<i>{}</i>".format(self.meta.get_translated_label("fallback_to_default_price_list")),
                    "<i>{}</i>".format(
                        stock_meta.get_translated_label("auto_insert_price_list_rate_if_missing")
                    ),
                    frappe.bold(_("Stock Settings")),
                )
            )

    def toggle_hide_tax_id(self):
        if not self.has_value_changed("hide_tax_id"):
            return

        _hide_tax_id = cint(self.hide_tax_id)

        for doctype in ("Sales Order", "Sales Invoice", "Delivery Note"):
            make_property_setter(
                doctype, "tax_id", "hidden", _hide_tax_id, "Check", validate_fields_for_doctype=False
            )
            make_property_setter(
                doctype, "tax_id", "print_hide", _hide_tax_id, "Check", validate_fields_for_doctype=False
            )

    def toggle_editable_rate_for_bundle_items(self):
        if not self.has_value_changed("editable_bundle_item_rates"):
            return

        editable_bundle_item_rates = cint(self.editable_bundle_item_rates)

        make_property_setter(
            "Packed Item",
            "rate",
            "read_only",
            not (editable_bundle_item_rates),
            "Check",
            validate_fields_for_doctype=False,
        )

    def toggle_discount_accounting_fields(self):
        if not self.has_value_changed("enable_discount_accounting"):
            return

        enable_discount_accounting = cint(self.enable_discount_accounting)

        make_property_setter(
            "Sales Invoice Item",
            "discount_account",
            "hidden",
            not (enable_discount_accounting),
            "Check",
            validate_fields_for_doctype=False,
        )
        if enable_discount_accounting:
            make_property_setter(
                "Sales Invoice Item",
                "discount_account",
                "mandatory_depends_on",
                "eval: doc.discount_amount",
                "Code",
                validate_fields_for_doctype=False,
            )
        else:
            make_property_setter(
                "Sales Invoice Item",
                "discount_account",
                "mandatory_depends_on",
                "",
                "Code",
                validate_fields_for_doctype=False,
            )

        make_property_setter(
            "Sales Invoice",
            "additional_discount_account",
            "hidden",
            not (enable_discount_accounting),
            "Check",
            validate_fields_for_doctype=False,
        )
        if enable_discount_accounting:
            make_property_setter(
                "Sales Invoice",
                "additional_discount_account",
                "mandatory_depends_on",
                "eval: doc.discount_amount",
                "Code",
                validate_fields_for_doctype=False,
            )
        else:
            make_property_setter(
                "Sales Invoice",
                "additional_discount_account",
                "mandatory_depends_on",
                "",
                "Code",
                validate_fields_for_doctype=False,
            )


def toggle_tracking_sales_commissions_section(hide):
    from erpnext.accounts.doctype.accounts_settings.accounts_settings import (
        SELLING_DOCTYPES,
        create_property_setter_for_hiding_field,
    )

    for doctype in SELLING_DOCTYPES:
        meta = frappe.get_meta(doctype)
        if meta.has_field("commission_section"):
            create_property_setter_for_hiding_field(doctype, "commission_section", hide)
        if meta.has_field("sales_team_section"):
            create_property_setter_for_hiding_field(doctype, "sales_team_section", hide)


def toggle_utm_analytics_section(hide):
    from erpnext.accounts.doctype.accounts_settings.accounts_settings import (
        create_property_setter_for_hiding_field,
    )

    for doctype in UTM_DOCTYPES:
        meta = frappe.get_meta(doctype)
        if meta.has_field("utm_analytics_section"):
            create_property_setter_for_hiding_field(doctype, "utm_analytics_section", hide)
