from __future__ import annotations

from apps.erpnext.registry import get_meta, get_model, list_doctypes
from apps.frappe import get_doc, new_doc
from apps.frappe.permissions import apply_user_permissions, get_permitted_fields, has_permission, raise_permission_error

def meta(doctype, user=None):
    if not has_permission(doctype, "read", user=user) and not has_permission(doctype, "select", user=user):
        raise_permission_error(doctype, "read")
    meta_doc = dict(get_meta(doctype))
    permitted = set(get_permitted_fields(doctype, user=user))
    meta_doc["fields"] = [
        field for field in meta_doc.get("fields", [])
        if field.get("fieldname") in permitted or field.get("fieldtype") in {"Section Break", "Column Break", "Tab Break"}
    ]
    return meta_doc

def get_document(doctype, name, user=None):
    doc = get_doc(doctype, name)
    if not has_permission(doctype, "read", doc=doc, user=user):
        raise_permission_error(doctype, "read")
    data = doc.as_dict()
    permitted = set(get_permitted_fields(doctype, user=user))
    return {key: value for key, value in data.items() if key.startswith("_") or key in permitted or key == "doctype"}

def list_documents(doctype, limit=20, user=None):
    if not has_permission(doctype, "read", user=user):
        raise_permission_error(doctype, "read")
    model = get_model(doctype)
    queryset = apply_user_permissions(doctype, model.objects.order_by("-modified"), user=user)
    fields = [field for field in ["name", "modified", "owner"] if field in get_permitted_fields(doctype, user=user)]
    if "name" not in fields:
        fields.insert(0, "name")
    return list(queryset.values(*fields)[: int(limit)])

def create_document(data, user=None):
    doctype = data.get("doctype")
    if not has_permission(doctype, "create", user=user):
        raise_permission_error(doctype, "create")
    doc = new_doc(doctype)
    if user and getattr(user, "is_authenticated", False):
        doc.owner = user.email
        doc.modified_by = user.email
    for key, value in data.items():
        if key != "doctype":
            setattr(doc, key, value)
    return doc.insert().as_dict()

def save_document(doctype, name, data, user=None):
    doc = get_doc(doctype, name)
    if not has_permission(doctype, "write", doc=doc, user=user):
        raise_permission_error(doctype, "write")
    for key, value in data.items():
        if key not in {"doctype", "name"}:
            setattr(doc, key, value)
    return doc.save().as_dict()

def submit_document(doctype, name, user=None):
    doc = get_doc(doctype, name)
    if not has_permission(doctype, "submit", doc=doc, user=user):
        raise_permission_error(doctype, "submit")
    return doc.submit().as_dict()

def cancel_document(doctype, name, user=None):
    doc = get_doc(doctype, name)
    if not has_permission(doctype, "cancel", doc=doc, user=user):
        raise_permission_error(doctype, "cancel")
    return doc.cancel().as_dict()

def known_doctypes():
    return list_doctypes()
