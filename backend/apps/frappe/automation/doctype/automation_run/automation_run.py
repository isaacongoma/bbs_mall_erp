import frappe
from frappe.model.document import Document
from frappe.query_builder import Interval
from frappe.query_builder.functions import Now


class AutomationRun(Document):


    doctype = 'Automation Run'

    _DOCTYPE_NAME = "Automation Run"

    @staticmethod
    def clear_old_logs(days=30):
        run = frappe.qb.DocType("Automation Run")
        old = (run.creation < (Now() - Interval(days=days))) & (run.status != "Waiting")
        names = frappe.qb.from_(run).select(run.name).where(old)
        step = frappe.qb.DocType("Automation Run Step")
        frappe.db.delete(step, filters=step.parent.isin(names))
        frappe.db.delete(run, filters=old)


def on_doctype_update():
    frappe.db.add_index("Automation Run", ["automation", "creation"])
    frappe.db.add_index("Automation Run", ["reference_doctype", "reference_name"])
