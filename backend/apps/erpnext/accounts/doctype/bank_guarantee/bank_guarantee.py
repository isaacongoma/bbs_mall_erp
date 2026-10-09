import frappe
from frappe import _
from frappe.model.document import Document


class BankGuarantee(Document):


    doctype = 'Bank Guarantee'

    def validate(self):
        if not (self.customer or self.supplier):
            frappe.throw(_("Select the customer or supplier."))

    def on_submit(self):
        if not self.bank_guarantee_number:
            frappe.throw(_("Enter the Bank Guarantee Number before submitting."))
        if not self.name_of_beneficiary:
            frappe.throw(_("Enter the name of the Beneficiary before submitting."))
        if not self.bank:
            frappe.throw(_("Enter the name of the bank or lending institution before submitting."))


@frappe.whitelist()
def get_voucher_details(bank_guarantee_type: str, reference_name: str):
    if not isinstance(reference_name, str):
        raise TypeError("reference_name must be a string")

    frappe.has_permission("Bank Guarantee", throw=True)

    fields_to_fetch = ["grand_total"]

    if bank_guarantee_type == "Receiving":
        doctype = "Sales Order"
        fields_to_fetch.append("customer")
        fields_to_fetch.append("project")
    else:
        doctype = "Purchase Order"
        fields_to_fetch.append("supplier")

    from erpnext.stock.doctype.company_restriction.company_restriction import get_allowed_companies

    allowed_companies = get_allowed_companies(frappe.session.user, "Bank Guarantee")
    if allowed_companies:
        company = frappe.db.get_value(doctype, reference_name, "company")
        if company and company not in allowed_companies:
            frappe.throw(_("Not permitted for {0}").format(company), frappe.PermissionError)

    return frappe.db.get_value(doctype, reference_name, fields_to_fetch, as_dict=True)
