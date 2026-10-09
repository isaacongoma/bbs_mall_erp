import frappe
from frappe import _
from frappe.model.document import Document


class JournalEntryTemplate(Document):


    doctype = 'Journal Entry Template'

    def validate(self):
        self.validate_party()
        self.validate_account_company()

    def validate_account_company(self):
        """Each row's account must belong to the template's company."""
        for account in self.accounts:
            if (
                account.account
                and frappe.get_cached_value("Account", account.account, "company") != self.company
            ):
                frappe.throw(
                    _("Row {0}: Account {1} does not belong to company {2}").format(
                        account.idx, account.account, self.company
                    )
                )

    def validate_party(self):
        """
        Loop over all accounts and see if party and party type is set correctly
        """
        for account in self.accounts:
            if account.party_type:
                account_type = frappe.get_cached_value("Account", account.account, "account_type")
                if account_type not in ["Receivable", "Payable"]:
                    frappe.throw(
                        _(
                            "Check row {0} for account {1}: Party Type is only allowed for Receivable or Payable accounts"
                        ).format(account.idx, account.account)
                    )

            if account.party and not account.party_type:
                frappe.throw(
                    _("Check row {0} for account {1}: Party is only allowed if Party Type is set").format(
                        account.idx, account.account
                    )
                )


@frappe.whitelist()
def get_naming_series():
    return frappe.get_meta("Journal Entry").get_field("naming_series").options
