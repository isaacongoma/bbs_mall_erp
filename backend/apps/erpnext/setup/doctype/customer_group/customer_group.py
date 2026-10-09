import frappe
from frappe import _
from frappe.utils.nestedset import NestedSet, get_root_of


class CustomerGroup(NestedSet):


    nsm_parent_field = "parent_customer_group"

    def validate(self):
        if not self.parent_customer_group:
            self.parent_customer_group = get_root_of("Customer Group")
        self.validate_currency_for_receivable_and_advance_account()

    def validate_currency_for_receivable_and_advance_account(self):
        for x in self.accounts:
            receivable_account_currency = None
            advance_account_currency = None

            if x.account:
                receivable_account_currency = frappe.get_cached_value(
                    "Account", x.account, "account_currency"
                )

            if x.advance_account:
                advance_account_currency = frappe.get_cached_value(
                    "Account", x.advance_account, "account_currency"
                )

            if (
                receivable_account_currency
                and advance_account_currency
                and receivable_account_currency != advance_account_currency
            ):
                frappe.throw(
                    _(
                        "Both Receivable Account: {0} and Advance Account: {1} must be of same currency for company: {2}"
                    ).format(
                        frappe.bold(x.account),
                        frappe.bold(x.advance_account),
                        frappe.bold(x.company),
                    )
                )

    def on_update(self):
        super().on_update()
        self.validate_one_root()


def get_parent_customer_groups(customer_group):
    lft, rgt = frappe.db.get_value("Customer Group", customer_group, ["lft", "rgt"])
    return frappe.get_all(
        "Customer Group",
        filters=[["lft", "<=", lft], ["rgt", ">=", rgt]],
        fields=["name"],
        order_by="lft asc",
    )


def on_doctype_update():
    frappe.db.add_index("Customer Group", ["lft", "rgt"])
