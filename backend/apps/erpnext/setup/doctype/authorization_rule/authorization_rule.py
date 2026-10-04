import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import cstr, flt


class AuthorizationRule(Document):


    doctype = 'Authorization Rule'

    def check_duplicate_entry(self):
        exists = frappe.get_all(
            "Authorization Rule",
            filters={
                "transaction": self.transaction,
                "based_on": self.based_on,
                "system_user": cstr(self.system_user),
                "system_role": cstr(self.system_role),
                "approving_user": cstr(self.approving_user),
                "approving_role": cstr(self.approving_role),
                "to_emp": cstr(self.to_emp),
                "to_designation": cstr(self.to_designation),
                "name": ["!=", self.name],
            },
            pluck="name",
        )
        auth_exists = exists[0] if exists else ""
        if auth_exists:
            frappe.throw(_("Duplicate Entry. Please check Authorization Rule {0}").format(auth_exists))

    def validate_rule(self):
        if not self.approving_role and not self.approving_user:
            frappe.throw(_("Please enter Approving Role or Approving User"))
        elif self.system_user and self.system_user == self.approving_user:
            frappe.throw(_("Approving User cannot be same as user the rule is Applicable To"))
        elif self.system_role and self.system_role == self.approving_role:
            frappe.throw(_("Approving Role cannot be same as role the rule is Applicable To"))
        elif self.transaction in [
            "Purchase Order",
            "Purchase Receipt",
            "Purchase Invoice",
            "Stock Entry",
        ] and self.based_on in [
            "Average Discount",
            "Customerwise Discount",
            "Itemwise Discount",
            "Item Group wise Discount",
        ]:
            frappe.throw(_("Cannot set authorization on basis of Discount for {0}").format(self.transaction))
        elif self.based_on == "Average Discount" and flt(self.value) > 100.00:
            frappe.throw(_("Discount must be less than 100"))
        elif self.based_on == "Customerwise Discount" and not self.master_name:
            frappe.throw(_("Customer required for 'Customerwise Discount'"))

    def validate(self):
        self.check_duplicate_entry()
        self.validate_rule()
        if not self.value:
            self.value = 0.0
