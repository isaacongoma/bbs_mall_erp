from frappe.model.document import Document


class AutomationAction(Document):
    """One step of a flow.

    `step_key` is a stable identifier that outputs, aliases and resumed runs
    refer to a step by, so it must survive reordering. `parent_step` holds the
    idx of the enclosing If step (0 for top-level steps) and `branch` says
    which arm of that If the step belongs to; the builder maintains both.
    """
    doctype = 'Automation Action'


    pass
