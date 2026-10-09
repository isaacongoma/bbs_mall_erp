import glob
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = os.path.join(ROOT, "docs", "reference", "erpnext_cloud_doctypes.json")
APPS = os.path.join(ROOT, "backend", "apps")
LAYOUT_TYPES = {"Section Break", "Column Break", "Tab Break", "HTML"}
STRIP = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "parent", "parentfield", "parenttype", "doctype"}
KEEP_LOCAL = {"fieldname", "fieldtype"}
DOCTYPE_PROPS = (
    "title_field", "search_fields", "sort_field", "sort_order", "quick_entry", "image_field", "timeline_field",
    "track_changes", "show_title_field_in_link", "links", "states", "description", "allow_import", "allow_rename",
    "allow_copy", "hide_toolbar", "show_preview_popup", "default_view", "grid_page_length", "row_format",
    "document_type", "icon", "subject_field", "sender_field", "sender_name_field", "show_name_in_global_search",
    "max_attachments", "default_print_format", "email_append_to", "allow_events_in_timeline", "protect_attached_files",
    "rows_threshold_for_grid_search", "translated_doctype", "make_attachments_public", "is_calendar_and_gantt",
)


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if v is not None and k not in STRIP}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value


def merge_fields(local_fields, ref_fields, report):
    local = {f["fieldname"]: f for f in local_fields}
    ref_names = {f["fieldname"] for f in ref_fields}
    merged = []
    for rf in ref_fields:
        cleaned = clean(rf)
        name = cleaned["fieldname"]
        if name in local:
            base = dict(local[name])
            for key, value in cleaned.items():
                if key in KEEP_LOCAL:
                    if key == "fieldtype" and value != base.get(key):
                        report["type_mismatch"].append((name, base.get(key), value))
                    continue
                base[key] = value
            for key in list(base):
                if key not in cleaned and key not in KEEP_LOCAL and key not in ("options",) and key in rf_optional_keys(base):
                    del base[key]
            merged.append(base)
        elif cleaned["fieldtype"] in LAYOUT_TYPES:
            merged.append(cleaned)
        else:
            report["skipped_new"].append(name)
    for lf in local_fields:
        if lf["fieldname"] in ref_names:
            continue
        if lf["fieldtype"] in LAYOUT_TYPES:
            continue
        hidden = dict(lf)
        hidden["hidden"] = 1
        hidden["reqd"] = 0
        hidden.pop("depends_on", None)
        hidden.pop("mandatory_depends_on", None)
        merged.append(hidden)
        report["hidden_local"].append(lf["fieldname"])
    return merged


def rf_optional_keys(field):
    return {"hidden", "reqd", "read_only", "depends_on", "mandatory_depends_on", "read_only_depends_on", "in_list_view", "in_standard_filter", "in_preview", "collapsible", "collapsible_depends_on", "description", "default", "label", "bold", "allow_on_submit", "no_copy", "print_hide", "fetch_from", "fetch_if_empty", "search_index", "set_only_once", "translatable", "permlevel", "width", "columns", "precision", "length", "unique", "ignore_user_permissions", "report_hide", "remember_last_selected_value", "allow_in_quick_entry", "hide_days", "hide_seconds", "non_negative", "in_global_search", "in_filter", "show_dashboard", "sticky", "documentation_url", "link_filters"}


def main(apply):
    with open(SNAPSHOT, encoding="utf8") as handle:
        reference = json.load(handle)
    changed = 0
    totals = {"skipped_new": [], "hidden_local": [], "type_mismatch": []}
    for path in glob.glob(os.path.join(APPS, "*", "*", "doctype", "*", "*.json")):
        try:
            with open(path, encoding="utf8") as handle:
                doc = json.load(handle)
        except ValueError:
            continue
        if not isinstance(doc, dict) or doc.get("doctype") != "DocType" or doc["name"] not in reference:
            continue
        ref = reference[doc["name"]]
        report = {"skipped_new": [], "hidden_local": [], "type_mismatch": []}
        fields = merge_fields(doc.get("fields", []), ref.get("fields", []), report)
        new = dict(doc)
        new["fields"] = fields
        new["field_order"] = [f["fieldname"] for f in fields]
        for key in DOCTYPE_PROPS:
            if key in ref and ref[key] not in (None, [], ""):
                new[key] = clean(ref[key]) if isinstance(ref[key], (list, dict)) else ref[key]
        if new != doc:
            changed += 1
            if apply:
                with open(path, "w", encoding="utf8") as handle:
                    json.dump(new, handle, ensure_ascii=False, indent=1)
                    handle.write("\n")
        for key, values in report.items():
            totals[key].extend((doc["name"], v) for v in values)
    print(("applied" if apply else "would change"), changed)
    for key, values in totals.items():
        print(key, len(values))
    with open(os.path.join(ROOT, "docs", "reference", "doctype_sync_report.json"), "w", encoding="utf8") as handle:
        json.dump(totals, handle, indent=1)


if __name__ == "__main__":
    main("--apply" in sys.argv)
