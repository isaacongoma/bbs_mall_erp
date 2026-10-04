import frappe
from frappe import _
from frappe.model.document import Document

from erpnext.assets.doctype.asset.depreciation import get_disposal_account_and_cost_center


class SalesInvoiceItem(Document):


    doctype = 'Sales Invoice Item'

    def validate_cost_center(self, company: str):
        cost_center_company = frappe.get_cached_value("Cost Center", self.cost_center, "company")
        if cost_center_company != company:
            frappe.throw(
                _("Row #{0}: Cost Center {1} does not belong to company {2}").format(
                    frappe.bold(self.idx), frappe.bold(self.cost_center), frappe.bold(company)
                )
            )

    def set_income_account_for_fixed_asset(self, company: str):
        """Set income account for fixed asset item based on company's disposal account and cost center."""
        if not self.is_fixed_asset:
            return

        disposal_account, depreciation_cost_center = get_disposal_account_and_cost_center(company)

        self.income_account = disposal_account
        if not self.cost_center:
            self.cost_center = depreciation_cost_center
