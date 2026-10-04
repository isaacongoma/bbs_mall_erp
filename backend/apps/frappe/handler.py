import frappe
from apps.frappe import exceptions


@frappe.whitelist()
def run_doc_method(method, docs=None, dt=None, dn=None, arg=None, args=None):
    if isinstance(docs, str):
        docs = frappe.parse_json(docs)
    if isinstance(args, str):
        args = frappe.parse_json(args)

    if dt and dn and not docs:
        doc = frappe.get_doc(dt, dn)
    elif docs:
        doc = frappe.get_doc(docs)
    else:
        raise exceptions.ValidationError("run_doc_method requires docs or dt and dn")

    doc.check_permission("read")

    method_fn = getattr(type(doc), method, None)
    if method_fn is None or not callable(method_fn):
        raise exceptions.DoesNotExistError(f"Method {method} not found on {doc.doctype}")
    frappe.is_whitelisted(method_fn)

    kwargs = args if isinstance(args, dict) else {}
    if arg is not None and not kwargs:
        kwargs = {"args": arg}
    return getattr(doc, method)(**kwargs)
