import json

import frappe

LAYOUT = {"Section Break", "Column Break", "Tab Break"}
TOP = (
    "documentation",
    "description",
    "title_field",
    "sort_field",
    "sort_order",
    "search_fields",
    "image_field",
    "quick_entry",
    "show_name_in_global_search",
    "allow_rename",
    "max_attachments",
    "icon",
    "track_changes",
)
FIELD = (
    "label",
    "options",
    "reqd",
    "hidden",
    "read_only",
    "in_list_view",
    "in_standard_filter",
    "depends_on",
    "default",
    "collapsible",
    "fetch_from",
    "bold",
    "allow_on_submit",
    "no_copy",
    "print_hide",
    "set_only_once",
    "mandatory_depends_on",
    "read_only_depends_on",
    "description",
    "in_preview",
    "columns",
    "precision",
    "length",
    "fieldtype",
)
CHECKS = {"reqd", "hidden", "read_only", "in_list_view", "in_standard_filter", "collapsible", "bold", "allow_on_submit", "no_copy", "print_hide", "set_only_once", "in_preview", "quick_entry", "show_name_in_global_search", "allow_rename", "track_changes"}
INTS = {"columns", "max_attachments"}


def blank(value):
    return value in (None, "", 0, "0", False)


def property_type(key):
    if key in CHECKS:
        return "Check"
    if key in INTS:
        return "Int"
    if key in ("description", "depends_on", "mandatory_depends_on", "read_only_depends_on", "options", "default"):
        return "Small Text" if key == "description" else "Text"
    return "Data"


def put(doc_type, kind, field_name, prop, value):
    name = f"{doc_type}-{field_name or 'main'}-{prop}"
    if kind == "DocType":
        name = f"{doc_type}-main-{prop}"
    row = frappe.db.get_value("Property Setter", name, "name")
    if blank(value):
        value_text = "0" if prop in CHECKS or prop in INTS else ""
    else:
        value_text = str(int(value)) if prop in CHECKS or prop in INTS else str(value)
    payload = {
        "doctype": "Property Setter",
        "doc_type": doc_type,
        "doctype_or_field": kind,
        "field_name": field_name,
        "property": prop,
        "property_type": property_type(prop),
        "value": value_text,
    }
    if row:
        frappe.db.set_value("Property Setter", row, "value", value_text)
        return False
    frappe.get_doc(payload).insert(ignore_permissions=True)
    return True


def run(path, skip=("Company", "Payment Entry", "Payment Entry Deduction", "Journal Entry", "Journal Entry Account")):
    with open(path, encoding="utf8") as handle:
        data = json.load(handle)
    created = 0
    for doctype, sides in data.items():
        reference, ours = sides.get("ref"), sides.get("our")
        if not reference or not ours or doctype in skip:
            continue
        ref_docs = {doc["name"]: doc for doc in reference if doc.get("doctype") == "DocType"}
        our_docs = {doc["name"]: doc for doc in ours if doc.get("doctype") == "DocType"}
        for name, ref_doc in ref_docs.items():
            our_doc = our_docs.get(name)
            if not our_doc or name in skip:
                continue
            for key in TOP:
                if blank(ref_doc.get(key)) != blank(our_doc.get(key)) or (not blank(ref_doc.get(key)) and ref_doc.get(key) != our_doc.get(key)):
                    created += put(name, "DocType", None, key, ref_doc.get(key))
            ref_fields = {f["fieldname"]: f for f in ref_doc["fields"]}
            our_fields = {f["fieldname"]: f for f in our_doc["fields"]}
            for fieldname, our_field in our_fields.items():
                ref_field = ref_fields.get(fieldname)
                if ref_field is None:
                    if our_field["fieldtype"] in LAYOUT or our_field.get("hidden"):
                        continue
                    created += put(name, "DocField", fieldname, "hidden", 1)
                    continue
                for key in FIELD:
                    if key == "fieldtype" and ref_field.get(key) == our_field.get(key):
                        continue
                    a, b = ref_field.get(key), our_field.get(key)
                    if blank(a) and blank(b):
                        continue
                    if a != b:
                        created += put(name, "DocField", fieldname, key, a)
            ref_order = [f["fieldname"] for f in ref_doc["fields"] if f["fieldname"] in our_fields]
            our_order = [f["fieldname"] for f in our_doc["fields"] if f["fieldname"] in ref_fields]
            if ref_order != our_order:
                extra = [f["fieldname"] for f in our_doc["fields"] if f["fieldname"] not in ref_fields]
                order = list(ref_order)
                for field_name in extra:
                    index = [f["fieldname"] for f in our_doc["fields"]].index(field_name)
                    previous = next((f["fieldname"] for f in reversed(our_doc["fields"][:index]) if f["fieldname"] in order), None)
                    order.insert(order.index(previous) + 1 if previous else 0, field_name)
                created += put(name, "DocType", None, "field_order", json.dumps(order))
    frappe.db.commit()
    frappe.clear_cache()
    return created
