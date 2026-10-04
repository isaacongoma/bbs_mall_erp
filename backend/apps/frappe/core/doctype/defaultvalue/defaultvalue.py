import frappe
from frappe.model.document import Document


class DefaultValue(Document):
    doctype = 'DefaultValue'

    _DOCTYPE_NAME = "DefaultValue"


    pass


def on_doctype_update():
    """Create indexes for `tabDefaultValue` on `(parent, defkey)`"""
    frappe.db.commit()
    frappe.db.add_index(
        doctype="DefaultValue",
        fields=["parent", "defkey"],
        index_name="defaultvalue_parent_defkey_index",
    )

    frappe.db.add_index(
        doctype="DefaultValue",
        fields=["parent", "parenttype"],
        index_name="defaultvalue_parent_parenttype_index",
    )
