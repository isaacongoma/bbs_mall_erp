import json

import frappe
from frappe.model.document import Document
from frappe.utils.jinja import validate_template


class ContractTemplate(Document):


    doctype = 'Contract Template'

    def validate(self):
        if self.contract_terms:
            validate_template(self.contract_terms, restrict_globals=True)


@frappe.whitelist()
def get_contract_template(template_name: str, doc: str | dict | Document):
    doc = frappe.parse_json(doc)

    contract_template = frappe.get_doc("Contract Template", template_name)
    contract_template.check_permission()
    contract_terms = None

    if contract_template.contract_terms:
        contract_terms = frappe.render_template(contract_template.contract_terms, doc, restrict_globals=True)

    return {"contract_template": contract_template, "contract_terms": contract_terms}
