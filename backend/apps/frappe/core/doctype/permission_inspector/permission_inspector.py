import frappe
from frappe.model.document import Document
from frappe.permissions import _pop_debug_log, has_permission


class PermissionInspector(Document):
    doctype = 'Permission Inspector'

    _DOCTYPE_NAME = "Permission Inspector"


    def onload(self):
        from frappe.core.doctype.permission_type.permission_type import get_doctype_ptype_map

        self.set_onload("doctype_ptype_map", get_doctype_ptype_map())

    @frappe.whitelist()
    def debug(self):
        if not (self.ref_doctype and self.user):
            return

        result = has_permission(
            self.ref_doctype, ptype=self.permission_type, doc=self.docname, user=self.user, debug=True
        )

        self.output = "\n==============================\n".join(_pop_debug_log())
        self.output += "\n\n" + f"Ouput of has_permission: {result}"

    def load_from_db(self):
        super(Document, self).__init__({"modified": None, "permission_type": "read"})

    def db_insert(self, *args, **kwargs): ...

    def db_update(self): ...

    @staticmethod
    def get_list(): ...

    @staticmethod
    def get_count(): ...

    @staticmethod
    def get_stats(): ...

    def delete(self): ...
