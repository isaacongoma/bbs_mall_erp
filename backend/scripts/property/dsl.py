import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "apps" / "bbs_property"
MODULE = "Property Management"
MODULE_DIR = "property_management"
STAMP = "2026-10-10 09:00:00.000000"

_counter = {"cb": 0, "sb": 0, "tb": 0}


def scrub(value):
    return re.sub(r"[^0-9A-Za-z]+", "_", value.lower()).strip("_")


def F(fieldname, fieldtype, label=None, **kw):
    field = {"fieldname": fieldname, "fieldtype": fieldtype}
    if label is None and fieldtype not in ("Column Break",):
        label = fieldname.replace("_", " ").title()
    if label is not None:
        field["label"] = label
    field.update(kw)
    return field


def CB(**kw):
    _counter["cb"] += 1
    return {"fieldname": f"column_break_{_counter['cb']}", "fieldtype": "Column Break", **kw}


def SB(label=None, fieldname=None, **kw):
    _counter["sb"] += 1
    fieldname = fieldname or (scrub(label) + "_section" if label else f"section_break_{_counter['sb']}")
    field = {"fieldname": fieldname, "fieldtype": "Section Break"}
    if label:
        field["label"] = label
    field.update(kw)
    return field


def TB(label, fieldname=None, **kw):
    fieldname = fieldname or scrub(label) + "_tab"
    return {"fieldname": fieldname, "fieldtype": "Tab Break", "label": label, **kw}


FULL = ["read", "write", "create", "delete", "email", "export", "print", "report", "share"]
EDIT = ["read", "write", "create", "email", "export", "print", "report", "share"]
READ = ["read", "export", "print", "report", "email"]
SUBMIT = ["submit", "cancel", "amend"]


def perm(role, rights, extra=()):
    row = {"role": role}
    for right in list(rights) + list(extra):
        row[right] = 1
    return row


def perms(submittable=False, billing=False, read_only_roles=("Property Accountant",)):
    extra = SUBMIT if submittable else ()
    rows = [
        perm("System Manager", FULL, extra),
        perm("Property Manager", FULL, extra),
        perm("Leasing Officer", EDIT, extra if not billing else ()),
        perm("Accounts Manager", FULL if billing else READ, extra if billing else ()),
        perm("Accounts User", EDIT if billing else READ, extra if billing else ()),
    ]
    for role in read_only_roles:
        rows.append(perm(role, EDIT if billing else READ, extra if billing else ()))
    return rows


def doctype(name, fields, **kw):
    istable = kw.get("istable", 0)
    submittable = kw.get("is_submittable", 0)
    meta = {
        "actions": [],
        "creation": STAMP,
        "doctype": "DocType",
        "engine": "InnoDB",
        "field_order": [field["fieldname"] for field in fields],
        "fields": fields,
        "links": kw.pop("links", []),
        "modified": STAMP,
        "modified_by": "Administrator",
        "module": MODULE,
        "name": name,
        "owner": "Administrator",
        "sort_field": "creation",
        "sort_order": "DESC",
        "states": kw.pop("states", []),
    }
    if istable:
        meta["editable_grid"] = 1
        meta["permissions"] = []
    else:
        meta["permissions"] = kw.pop("permissions", None) or perms(bool(submittable), kw.pop("billing", False))
        meta["track_changes"] = 1
    kw.pop("billing", None)
    meta.update(kw)
    return meta


def write_doctype(meta):
    name = meta["name"]
    folder = ROOT / MODULE_DIR / "doctype" / scrub(name)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "__init__.py").touch()
    path = folder / f"{scrub(name)}.json"
    path.write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return folder
