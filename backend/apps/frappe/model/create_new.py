import frappe


def get_new_doc(doctype, parent_doc=None, parentfield=None, as_dict=False):
    return frappe.new_doc(doctype, parent_doc=parent_doc, parentfield=parentfield, as_dict=as_dict)
