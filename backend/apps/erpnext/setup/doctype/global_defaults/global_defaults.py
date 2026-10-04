"""Global Defaults"""

import frappe
import frappe.defaults
from frappe.custom.doctype.property_setter.property_setter import make_property_setter
from frappe.utils import cint

keydict = {
    "company": "default_company",
    "currency": "default_currency",
    "country": "country",
    "hide_currency_symbol": "hide_currency_symbol",
    "account_url": "account_url",
    "disable_rounded_total": "disable_rounded_total",
    "disable_in_words": "disable_in_words",
}

ROUNDED_TOTAL_DOCTYPES = (
    "Quotation",
    "Sales Order",
    "POS Invoice",
    "Sales Invoice",
    "Delivery Note",
    "Supplier Quotation",
    "Purchase Order",
    "Purchase Invoice",
    "Purchase Receipt",
)

from frappe.model.document import Document


class GlobalDefaults(Document):


    doctype = 'Global Defaults'

    def on_update(self):
        """update defaults"""
        for key in keydict:
            frappe.db.set_default(key, self.get(keydict[key], ""))

        if self.default_currency:
            frappe.db.set_value("Currency", self.default_currency, "enabled", 1)

        self.toggle_rounded_total()
        self.toggle_in_words()
        self.set_disable_rounded_total_on_pos_profiles()

        frappe.clear_cache()

    @frappe.whitelist()
    def get_defaults(self):
        return frappe.defaults.get_defaults()

    def toggle_rounded_total(self):
        for doctype in ROUNDED_TOTAL_DOCTYPES:
            make_property_setter(
                doctype,
                "base_rounded_total",
                "hidden",
                cint(self.disable_rounded_total),
                "Check",
                validate_fields_for_doctype=False,
            )

            make_property_setter(
                doctype,
                "rounded_total",
                "hidden",
                cint(self.disable_rounded_total),
                "Check",
                validate_fields_for_doctype=False,
            )

            make_property_setter(
                doctype,
                "rounded_total",
                "print_hide",
                cint(self.disable_rounded_total),
                "Check",
                validate_fields_for_doctype=False,
            )

            make_property_setter(
                doctype,
                "disable_rounded_total",
                "default",
                cint(self.disable_rounded_total),
                "Text",
                validate_fields_for_doctype=False,
            )

    def toggle_in_words(self):
        for doctype in ROUNDED_TOTAL_DOCTYPES:
            make_property_setter(
                doctype,
                "in_words",
                "hidden",
                cint(self.disable_in_words),
                "Check",
                validate_fields_for_doctype=False,
            )
            make_property_setter(
                doctype,
                "in_words",
                "print_hide",
                cint(self.disable_in_words),
                "Check",
                validate_fields_for_doctype=False,
            )

    def set_disable_rounded_total_on_pos_profiles(self):
        POSProfile = frappe.qb.DocType("POS Profile")

        frappe.qb.update(POSProfile).set(
            POSProfile.disable_rounded_total, cint(self.disable_rounded_total)
        ).run()
