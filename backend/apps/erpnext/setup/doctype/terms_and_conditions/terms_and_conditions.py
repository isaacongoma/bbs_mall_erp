import frappe
from frappe import _, throw

from apps.frappe.model.document import Document
from apps.frappe.utils import cint
from apps.frappe.utils.jinja import validate_template


class TermsandConditions(Document):
    doctype = "Terms and Conditions"

    def validate(self):
        if self.terms:
            validate_template(self.terms, restrict_globals=True)

        if not cint(self.buying) and not cint(self.selling) and not cint(self.hr) and not cint(self.disabled):
            throw(_("At least one of the Applicable Modules should be selected"))


@frappe.whitelist()
def get_terms_and_conditions(template_name: str, doc: str | dict):
    doc = frappe.parse_json(doc)

    tnc = frappe.get_cached_doc("Terms and Conditions", template_name)
    tnc.check_permission()

    if not tnc.terms:
        return

    return frappe.render_template(tnc.terms, doc, restrict_globals=True)
