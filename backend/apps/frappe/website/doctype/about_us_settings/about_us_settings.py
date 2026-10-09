import frappe
from frappe.model.document import Document


class AboutUsSettings(Document):
    doctype = 'About Us Settings'

    _DOCTYPE_NAME = "About Us Settings"


    def on_update(self):
        from frappe.website.utils import clear_cache

        clear_cache("about")


def get_args():
    obj = frappe.get_doc("About Us Settings")
    return {"obj": obj}
