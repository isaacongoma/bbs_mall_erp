import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.naming import getseries, parse_naming_series
from frappe.utils.data import evaluate_filters


class DocumentNamingRule(Document):
    doctype = 'Document Naming Rule'

    _DOCTYPE_NAME = "Document Naming Rule"


    def validate(self):
        self.validate_fields_in_conditions()

    def clear_doctype_map(self):
        frappe.cache_manager.clear_doctype_map(self.doctype, self.document_type)

    def on_update(self):
        self.clear_doctype_map()

    def on_trash(self):
        self.clear_doctype_map()

    def validate_fields_in_conditions(self):
        meta = frappe.get_meta(self.document_type)
        for condition in self.conditions:
            if not meta.has_field(condition.field):
                frappe.throw(
                    _("{0} is not a field of doctype {1}").format(
                        frappe.bold(condition.field), frappe.bold(self.document_type)
                    )
                )

    def apply(self, doc):
        """
        Apply naming rules for the given document. Will set `name` if the rule is matched.

        Conditions are evaluated one at a time: Filters.optimize collapses repeated equalities on a
        field into an `in`, which would read the rows as alternatives rather than requirements.
        """
        if not all(
            evaluate_filters(doc, [(self.document_type, d.field, d.condition, d.value)])
            for d in self.conditions
        ):
            return

        prefix = parse_naming_series(self.prefix, doc=doc)
        doc.name = prefix + getseries(prefix, self.prefix_digits)
