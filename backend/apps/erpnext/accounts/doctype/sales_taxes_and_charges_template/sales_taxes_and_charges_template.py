import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt

from erpnext.controllers.accounts_controller import (
    validate_account_head,
    validate_cost_center,
    validate_inclusive_tax,
    validate_taxes_and_charges,
)


class SalesTaxesandChargesTemplate(Document):


    doctype = 'Sales Taxes and Charges Template'

    def validate(self):
        valdiate_taxes_and_charges_template(self)

    def autoname(self):
        if self.company and self.title:
            abbr = frappe.get_cached_value("Company", self.company, "abbr")
            self.name = f"{self.title} - {abbr}"

    def set_missing_values(self):
        for data in self.taxes:
            if data.charge_type == "On Net Total" and flt(data.rate) == 0.0:
                data.rate = frappe.get_cached_value("Account", data.account_head, "tax_rate")


def valdiate_taxes_and_charges_template(doc):

    if doc.is_default == 1:
        template = frappe.qb.DocType(doc.doctype)
        (
            frappe.qb.update(template)
            .set(template.is_default, 0)
            .where(
                (template.is_default == 1) & (template.name != doc.name) & (template.company == doc.company)
            )
        ).run()

    validate_disabled(doc)

    validate_for_tax_category(doc)

    for tax in doc.get("taxes"):
        validate_taxes_and_charges(tax)
        validate_account_head(tax.idx, tax.account_head, doc.company, _("Taxes and Charges"))
        validate_cost_center(tax, doc)
        validate_inclusive_tax(tax, doc)


def validate_disabled(doc):
    if doc.is_default and doc.disabled:
        frappe.throw(_("Disabled template must not be default template"))


def validate_for_tax_category(doc):
    if not doc.tax_category:
        return

    if frappe.db.exists(
        doc.doctype,
        {
            "company": doc.company,
            "tax_category": doc.tax_category,
            "disabled": 0,
            "name": ["!=", doc.name],
        },
    ):
        frappe.throw(
            _(
                "A template with tax category {0} already exists. Only one template is allowed with each tax category"
            ).format(frappe.bold(doc.tax_category))
        )
