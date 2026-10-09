import frappe
from frappe.model.document import Document


class WebsiteMetaTag(Document):
    _DOCTYPE_NAME = "Website Meta Tag"


    def get_content(self):
        return (self.value or "").replace("\n", " ")

    def get_meta_dict(self):
        return {self.key: self.get_content()}

    def set_in_context(self, context):
        context.setdefault("metatags", frappe._dict({}))
        context.metatags[self.key] = self.get_content()
        return context
