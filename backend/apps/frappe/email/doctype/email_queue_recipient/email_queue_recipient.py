import frappe
from frappe.model.document import Document


class EmailQueueRecipient(Document):
    _DOCTYPE_NAME = "Email Queue Recipient"


    DOCTYPE = "Email Queue Recipient"

    def is_mail_to_be_sent(self):
        return self.status == "Not Sent"

    def is_mail_sent(self):
        return self.status == "Sent"

    def update_db(self, commit=False, **kwargs):
        frappe.db.set_value(self.DOCTYPE, self.name, kwargs)
        if commit:
            frappe.db.commit()


def on_doctype_update():
    """Index required for log clearing, modified is not indexed on child table by default"""
    frappe.db.add_index("Email Queue Recipient", ["modified"])
