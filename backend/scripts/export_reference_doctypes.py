import glob
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = os.path.join(ROOT, "docs", "reference", "erpnext_cloud_doctypes.json")
TARGET = os.path.join(ROOT, "docs", "reference_doctypes")
DROP_DOC = {"owner", "creation", "modified", "modified_by", "migration_hash", "docstatus", "idx", "name_before"}
DROP_ROW = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "parent", "parentfield", "parenttype"}


def scrub(value):
    return re.sub(r"[^a-z0-9_]", "", value.lower().replace(" ", "_").replace("-", "_"))


def known():
    names = set()
    for base in ("vendor/erpnext/erpnext", "vendor/frappe/frappe", "vendor/hrms/hrms"):
        for path in glob.glob(os.path.join(ROOT, base, "**", "doctype", "*", "*.json"), recursive=True):
            try:
                with open(path, encoding="utf8") as handle:
                    meta = json.load(handle)
            except ValueError:
                continue
            if isinstance(meta, dict) and meta.get("doctype") == "DocType":
                names.add(meta["name"])
    return names


def main():
    with open(SNAPSHOT, encoding="utf8") as handle:
        reference = json.load(handle)
    have = known()
    written = []
    for name, meta in reference.items():
        if name in have:
            continue
        doc = {k: v for k, v in meta.items() if k not in DROP_DOC and v is not None}
        for key in ("fields", "permissions", "links", "actions", "states"):
            if isinstance(doc.get(key), list):
                doc[key] = [{k: v for k, v in row.items() if k not in DROP_ROW and v is not None} for row in doc[key]]
        doc["custom"] = 0
        module = scrub(doc.get("module") or "kenya")
        out = os.path.join(TARGET, module, "doctype", scrub(name))
        os.makedirs(out, exist_ok=True)
        with open(os.path.join(out, scrub(name) + ".json"), "w", encoding="utf8") as handle:
            json.dump(doc, handle, ensure_ascii=False, indent=1)
        written.append(name)
    print(len(written), written)


if __name__ == "__main__":
    main()
