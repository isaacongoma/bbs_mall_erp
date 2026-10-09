from frappe.model.document import Document


class QualityAction(Document):


    doctype = 'Quality Action'

    def validate(self):
        self.status = "Open" if any([d.status == "Open" for d in self.resolutions]) else "Completed"
