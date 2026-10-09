import json
import os

import frappe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LAYOUT = {"Section Break", "Column Break", "Tab Break"}


def run(path):
    with open(path, encoding="utf8") as handle:
        data = json.load(handle)
    hidden = []
    for doctype, sides in data.items():
        reference, ours = sides.get("ref"), sides.get("our")
        if not reference or not ours:
            continue
        ref_docs = {doc["name"]: doc for doc in reference if doc.get("doctype") == "DocType"}
        for doc in ours:
            if doc.get("doctype") != "DocType" or doc["name"] not in ref_docs:
                continue
            known = {field["fieldname"] for field in ref_docs[doc["name"]]["fields"]}
            for field in doc["fields"]:
                if field["fieldname"] in known or field["fieldtype"] in LAYOUT or field.get("hidden"):
                    continue
                name = f"{doc['name']}-{field['fieldname']}-hidden"
                if frappe.db.exists("Property Setter", name):
                    continue
                frappe.get_doc(
                    {
                        "doctype": "Property Setter",
                        "doc_type": doc["name"],
                        "doctype_or_field": "DocField",
                        "field_name": field["fieldname"],
                        "property": "hidden",
                        "property_type": "Check",
                        "value": "1",
                    }
                ).insert(ignore_permissions=True)
                hidden.append(name)
    frappe.db.commit()
    frappe.clear_cache()
    return hidden
