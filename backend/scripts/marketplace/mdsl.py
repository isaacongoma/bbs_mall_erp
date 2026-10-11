import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("property_dsl", HERE.parent / "property" / "dsl.py")
_property = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_property)

F, CB, SB, TB, scrub = _property.F, _property.CB, _property.SB, _property.TB, _property.scrub
FULL, EDIT, READ, SUBMIT, perm = _property.FULL, _property.EDIT, _property.READ, _property.SUBMIT, _property.perm
STAMP = "2026-10-12 09:00:00.000000"

APP = "bbs_marketplace"
ROOT = HERE.parents[1] / "apps" / APP
MODULE = "Marketplace"
MODULE_DIR = "marketplace"

MANAGER = "Marketplace Manager"
OPERATIONS = "Marketplace Operations"
FINANCE = "Marketplace Finance"
MODERATOR = "Catalog Moderator"


def perms(kind="standard", submittable=False):
    extra = SUBMIT if submittable else ()
    rows = [perm("System Manager", FULL, extra), perm(MANAGER, FULL, extra)]
    if kind == "catalog":
        rows += [perm(MODERATOR, EDIT), perm(OPERATIONS, READ)]
    elif kind == "operations":
        rows += [perm(OPERATIONS, EDIT, ()), perm(MODERATOR, READ), perm(FINANCE, READ)]
    elif kind == "finance":
        rows += [perm(FINANCE, EDIT, extra), perm("Accounts Manager", FULL, extra), perm("Accounts User", READ), perm(OPERATIONS, READ)]
    elif kind == "readonly":
        rows = [perm("System Manager", ["read", "export", "print", "report"]), perm(MANAGER, READ), perm(FINANCE, READ), perm(OPERATIONS, READ), perm("Accounts Manager", READ)]
    else:
        rows += [perm(OPERATIONS, EDIT), perm(FINANCE, READ)]
    return rows


def doctype(name, fields, kind="standard", **kw):
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
        "module": kw.pop("module", MODULE),
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
        meta["permissions"] = kw.pop("permissions", None) or perms(kind, bool(submittable))
        meta["track_changes"] = 1
    meta.update(kw)
    return meta


def write_doctype(meta):
    name = meta["name"]
    folder = ROOT / MODULE_DIR / "doctype" / scrub(name)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "__init__.py").touch()
    (folder / f"{scrub(name)}.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return folder
