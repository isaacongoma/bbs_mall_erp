import glob
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = os.path.join(ROOT, "docs", "reference", "erpnext_cloud_boot_snapshot.json")
APPS = os.path.join(ROOT, "backend", "apps")

ITEM_KEYS = (
    "label", "link_to", "link_type", "type", "icon", "child", "collapsible", "indent",
    "keep_closed", "url", "show_arrow", "filters", "route", "route_options", "tab",
    "open_in_new_tab", "is_default_module",
)
DEFAULTS = {"added": 0, "hidden": 0}


def convert_item(item):
    out = dict(DEFAULTS)
    for key in ITEM_KEYS:
        value = item.get(key)
        if value is None:
            continue
        out[key] = value
    return out


def main(apply):
    with open(SNAPSHOT, encoding="utf8") as handle:
        reference = json.load(handle)["module_sidebars"]
    changed = []
    for path in glob.glob(os.path.join(APPS, "*", "**", "sidebar", "*", "*.json"), recursive=True):
        with open(path, encoding="utf8") as handle:
            doc = json.load(handle)
        if doc.get("doctype") != "Sidebar" or doc["name"] not in reference:
            continue
        ref = reference[doc["name"]]
        items = [convert_item(item) for item in ref["items"]]
        previous = [{k: v for k, v in i.items() if k not in DEFAULTS} for i in doc.get("items", [])]
        current = [{k: v for k, v in i.items() if k not in DEFAULTS} for i in items]
        if previous == current and doc.get("header_icon") == ref.get("header_icon"):
            continue
        changed.append((doc["name"], len(previous), len(items)))
        if apply:
            doc["items"] = items
            if ref.get("header_icon"):
                doc["header_icon"] = ref["header_icon"]
            with open(path, "w", encoding="utf8") as handle:
                json.dump(doc, handle, ensure_ascii=False, indent=1)
                handle.write("\n")
    for name, before, after in sorted(changed):
        print(f"{name}: {before} -> {after}")
    print("changed" if apply else "would change", len(changed))


if __name__ == "__main__":
    main("--apply" in sys.argv)
