import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = os.path.join(ROOT, "docs", "reference", "erpnext_cloud_workspaces.json")
APPS = os.path.join(ROOT, "backend", "apps")
SKIP_WORKSPACES = {"eTims", "Kenya"}
LIST_FIELDS = ("charts", "number_cards", "shortcuts", "links", "quick_lists", "custom_blocks", "roles")
DOCTYPE_DIRS = {
    "Dashboard Chart": "dashboard_chart",
    "Number Card": "number_card",
    "Module Onboarding": "module_onboarding",
    "Onboarding Step": "onboarding_step",
}


def scrub(value):
    return re.sub(r"[^a-z0-9_]", "", value.lower().replace(" ", "_").replace("-", "_"))


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value


def read(path):
    with open(path, encoding="utf8") as handle:
        return json.load(handle)


def write(path, doc):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as handle:
        json.dump(doc, handle, ensure_ascii=False, indent=1)
        handle.write("\n")


def index_fixtures(doctype_dir):
    found = {}
    for path in glob.glob(os.path.join(APPS, "*", "**", doctype_dir, "*", "*.json"), recursive=True):
        doc = read(path)
        found[doc["name"]] = (path, doc)
    return found


def module_location(module_dirs, module):
    for path in module_dirs:
        parts = os.path.normpath(path).split(os.sep)
        if "apps" in parts:
            index = parts.index("apps")
            if len(parts) > index + 2 and parts[index + 2] == scrub(module):
                return os.path.join(APPS, parts[index + 1], parts[index + 2])
    return None


def main(apply):
    snapshot = read(SNAPSHOT)
    changed = {"workspace": 0, "created": 0, "updated": 0}

    workspaces = index_fixtures("workspace")
    module_dirs = [path for path, _ in workspaces.values()]
    for name, entry in snapshot["pages"].items():
        if name in SKIP_WORKSPACES or name not in workspaces:
            continue
        path, local = workspaces[name]
        reference = clean(entry["workspace"])
        merged = dict(local)
        for key, value in reference.items():
            if key in ("name", "owner", "creation", "modified", "modified_by", "doctype", "docstatus", "idx"):
                continue
            merged[key] = value
        for field in LIST_FIELDS:
            merged[field] = reference.get(field, [])
        if merged != local:
            changed["workspace"] += 1
            if apply:
                write(path, merged)

    onboarding_modules = {}
    for key, doc in snapshot["docs"].items():
        if key.startswith("Module Onboarding::"):
            for step in doc.get("steps", []):
                onboarding_modules[step["step"]] = doc.get("module")

    def sync_doc(doctype, doc, module):
        directory = DOCTYPE_DIRS[doctype]
        fixtures = index_fixtures(directory)
        reference = clean(doc)
        if doc["name"] in fixtures:
            path, local = fixtures[doc["name"]]
            merged = dict(local)
            for key, value in reference.items():
                if key in ("owner", "creation", "modified", "modified_by", "docstatus", "idx"):
                    continue
                merged[key] = value
            if merged != local:
                changed["updated"] += 1
                if apply:
                    write(path, merged)
            return
        base = module_location(module_dirs, module) if module else None
        if base is None:
            return
        reference["doctype"] = doctype
        path = os.path.join(base, directory, scrub(doc["name"]), f"{scrub(doc['name'])}.json")
        changed["created"] += 1
        if apply:
            write(path, reference)

    for key, doc in snapshot["docs"].items():
        doctype = key.split("::")[0]
        sync_doc(doctype, doc, doc.get("module"))
    for name, doc in snapshot["steps"].items():
        sync_doc("Onboarding Step", doc, onboarding_modules.get(name))

    print(("applied" if apply else "would apply"), changed)


if __name__ == "__main__":
    main("--apply" in sys.argv)
