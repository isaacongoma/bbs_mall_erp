import frappe
from frappe import _
from frappe.model.document import Document


class OnboardingStep(Document):
    doctype = 'Onboarding Step'

    _DOCTYPE_NAME = "Onboarding Step"


    def before_export(self, doc):
        doc.is_complete = 0
        doc.is_skipped = 0


@frappe.whitelist()
def get_onboarding_steps(ob_steps: str | list):
    steps = []
    for s in frappe.parse_json(ob_steps):
        doc = frappe.get_doc("Onboarding Step", s.get("step"))
        step = doc.as_dict().copy()
        step.label = _(doc.title)
        if step.action == "Create Entry":
            step.is_submittable = frappe.db.get_value(
                "DocType", step.reference_document, "is_submittable", cache=True
            )
        steps.append(step)

    return steps
