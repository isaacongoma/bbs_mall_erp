import frappe
from frappe.model.document import Document


class WebsiteSidebar(Document):
    doctype = 'Website Sidebar'

    _DOCTYPE_NAME = "Website Sidebar"


    def get_items(self):
        items = frappe.get_all(
            "Website Sidebar Item",
            filters={"parent": self.name},
            fields=["title", "route", "group"],
            order_by="idx asc",
        )

        items_by_group = {}
        items_without_group = []
        for item in items:
            if item.group:
                items_by_group.setdefault(item.group, []).append(item)
            else:
                items_without_group.append(item)

        out = [{"group_title": group, "group_items": items} for group, items in items_by_group.items()]
        out += items_without_group
        return out
