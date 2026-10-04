import frappe
from frappe import _
from frappe.model.document import Document


class ModeofPayment(Document):


    doctype = 'Mode of Payment'

    def validate(self):
        self.validate_accounts()
        self.validate_repeating_companies()
        self.validate_pos_mode_of_payment()

    def validate_repeating_companies(self):
        """Error when Same Company is entered multiple times in accounts"""
        accounts_list = []
        for entry in self.accounts:
            accounts_list.append(entry.company)

        if len(accounts_list) != len(set(accounts_list)):
            frappe.throw(_("Same Company is entered more than once"))

    def validate_accounts(self):
        for entry in self.accounts:
            """Error when Company of Ledger account doesn't match with Company Selected"""
            if frappe.get_cached_value("Account", entry.default_account, "company") != entry.company:
                frappe.throw(
                    _("Account {0} does not match with Company {1} in Mode of Account: {2}").format(
                        entry.default_account, entry.company, self.name
                    )
                )

    def validate_pos_mode_of_payment(self):
        if not self.enabled:
            pos_profiles = frappe.get_all(
                "Sales Invoice Payment",
                filters={"parenttype": "POS Profile", "mode_of_payment": self.name},
                pluck="parent",
            )

            if pos_profiles:
                message = _(
                    "POS Profile {0} contains Mode of Payment {1}. Please remove them to disable this mode."
                ).format(frappe.bold(", ".join(pos_profiles)), frappe.bold(str(self.name)))
                frappe.throw(message, title=_("Not Allowed"))
