import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class AssetActivity(Document):


    pass


def add_asset_activity(asset, subject):
    frappe.get_doc(
        {
            "doctype": "Asset Activity",
            "asset": asset,
            "subject": subject,
            "user": frappe.session.user,
            "date": now_datetime(),
        }
    ).insert(ignore_permissions=True, ignore_links=True)
