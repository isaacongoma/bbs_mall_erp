from __future__ import annotations

import json
import keyword
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


PILOT_DOCTYPES = [
    "Fiscal Year",
    "Fiscal Year Company",
    "Currency",
    "UOM",
    "UOM Conversion Factor",
    "Item Group",
    "Cost Center",
    "Branch",
    "Department",
    "Designation",
    "Terms and Conditions",
    "Holiday List",
    "Territory",
    "Customer Group",
    "Supplier Group",
    "Sales Person",
    "Holiday",
    "Party Account",
    "Customer Credit Limit",
    "Item Default",
    "Item Tax",
    "Target Detail",
    "Accounts Settings",
    "Global Defaults",
    "Selling Settings",
    "Buying Settings",
    "Stock Settings",
    "DefaultValue",
    "Property Setter",
    "Custom Field",
    "Accounting Dimension",
    "Accounting Dimension Detail",
    "Repost Allowed Types",
    "Scheduler Event",
    "Scheduled Job Type",
    "Account",
    "GL Entry",
    "Stock Ledger Entry",
    "Warehouse",
    "Warehouse Type",
    "Mode of Payment",
    "Mode of Payment Account",
    "Financial Report Template",
    "Financial Report Row",
    "Sales Taxes and Charges Template",
    "Sales Taxes and Charges",
    "Purchase Taxes and Charges Template",
    "Purchase Taxes and Charges",
    "Item Tax Template",
    "Item Tax Template Detail",
    "Tax Category",
    "Account Category",
    "Address",
    "Contact",
    "Contact Email",
    "Contact Phone",
    "Dynamic Link",
    "Party Type",
    "Repost Item Valuation",
    "Letter Head",
    "Company",
]

HAND_DEFINED = {"Role", "Has Role", "User", "DocPerm", "User Permission", "DocField", "DocType", "Singles"}

FRAPPE_CORE_DOCTYPES = [
    "Role",
    "Has Role",
    "DocPerm",
    "User Permission",
    "Custom Field",
    "Property Setter",
    "Version",
    "Workflow",
    "Workflow State",
    "Workflow Action Master",
    "Workflow Document State",
    "Workflow Transition",
    "Number Card",
    "Dashboard",
    "Dashboard Chart",
    "Report",
    "Print Format",
    "Letter Head",
    "Notification",
    "Country",
    "Language",
    "Module Def",
    "Defaults",
    "Prepared Report",
    "Error Log",
    "Scheduled Job Type",
    "Bulk Update",
]

HRMS_STAGE1_DOCTYPES = [
    "HR Settings",
    "Employment Type",
    "Employee Grade",
    "Designation Skill",
    "Leave Type",
    "Holiday List Assignment",
    "Shift Type",
    "Identification Document Type",
    "Interest",
]

FIELD_TYPES = {
    "Data": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Select": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Link": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Dynamic Link": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Autocomplete": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Color": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Barcode": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Read Only": "models.CharField(max_length={length}, blank=True, null=True, default={default})",
    "Small Text": "models.TextField(blank=True, null=True, default={default})",
    "Text": "models.TextField(blank=True, null=True, default={default})",
    "Long Text": "models.TextField(blank=True, null=True, default={default})",
    "Text Editor": "models.TextField(blank=True, null=True, default={default})",
    "Code": "models.TextField(blank=True, null=True, default={default})",
    "JSON": "models.TextField(blank=True, null=True, default={default})",
    "HTML Editor": "models.TextField(blank=True, null=True, default={default})",
    "Markdown Editor": "models.TextField(blank=True, null=True, default={default})",
    "Password": "models.TextField(blank=True, null=True, default={default})",
    "Attach": "models.TextField(blank=True, null=True, default={default})",
    "Attach Image": "models.TextField(blank=True, null=True, default={default})",
    "Signature": "models.TextField(blank=True, null=True, default={default})",
    "Geolocation": "models.TextField(blank=True, null=True, default={default})",
    "Currency": "models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)",
    "Float": "models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)",
    "Percent": "models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)",
    "Duration": "models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)",
    "Int": "models.IntegerField(null=True, blank=True)",
    "Long Int": "models.BigIntegerField(null=True, blank=True)",
    "Check": "models.SmallIntegerField(default={check_default})",
    "Date": "models.DateField(null=True, blank=True)",
    "Datetime": "FrappeDateTimeField(null=True, blank=True)",
    "Time": "FrappeTimeField(null=True, blank=True)",
}

SKIP_FIELD_TYPES = {
    "Section Break",
    "Column Break",
    "Tab Break",
    "HTML",
    "Button",
    "Heading",
    "Image",
    "Table",
    "Table MultiSelect",
}


def class_name(doctype):
    return re.sub(r"[^0-9A-Za-z]", "", doctype.title())


def module_name(doctype):
    return re.sub(r"[^0-9A-Za-z]+", "_", doctype.lower()).strip("_")


def field_name(name):
    value = re.sub(r"[^0-9A-Za-z_]", "_", name)
    if value and value[0].isdigit():
        value = f"field_{value}"
    if value in {"import", "print", "class"}:
        value = f"{value}_field"
    return value


def literal_default(field):
    default = field.get("default")
    if default in (None, "Today", "__user"):
        return repr("")
    return repr(str(default))


def vendor_bases():
    root = Path(settings.BASE_DIR).parent
    return {
        "erpnext": root / "vendor" / "erpnext" / "erpnext",
        "frappe": root / "vendor" / "frappe" / "frappe",
        "hrms": root / "vendor" / "hrms" / "hrms",
        "reference": root / "docs" / "reference_doctypes",
    }


def source_paths():
    for base in vendor_bases().values():
        if base.exists():
            yield from base.glob("**/doctype/*/*.json")


def source_app(path):
    resolved = path.resolve()
    for app_name, base in vendor_bases().items():
        try:
            resolved.relative_to(base.resolve())
            return app_name
        except ValueError:
            continue
    return "erpnext"


def load_sources():
    result = {}
    for path in source_paths():
        with path.open(encoding="utf-8") as handle:
            meta = json.load(handle)
        if isinstance(meta, dict) and meta.get("doctype") == "DocType":
            result[meta["name"]] = path
    return result


def model_field(field):
    ftype = field.get("fieldtype")
    if ftype in SKIP_FIELD_TYPES:
        return None
    template = FIELD_TYPES.get(ftype, FIELD_TYPES["Data"])
    length = int(field.get("length") or 140)
    if length <= 0:
        length = 140
    try:
        check_default = int(field.get("default") or 0)
    except ValueError:
        check_default = 0
    return template.format(length=length, default=literal_default(field), check_default=check_default)


def module_for(meta):
    return module_name(meta.get("module") or "core")


def copy_if_changed(source, target):
    data = source.read_bytes()
    if target.exists() and target.read_bytes() == data:
        return
    target.write_bytes(data)


def write_text_if_changed(path, text):
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return
    path.write_text(text, encoding="utf-8")


def generated_classes(target_root):
    rows = []
    for path in sorted(target_root.glob("*/doctype/*/*.json")):
        with path.open(encoding="utf-8") as handle:
            meta = json.load(handle)
        if not isinstance(meta, dict) or "name" not in meta or meta.get("issingle"):
            continue
        doctype = meta["name"]
        if doctype in HAND_DEFINED:
            continue
        mod = path.parts[-4]
        dt_module = path.parent.name
        if not (path.parent / f"{dt_module}_generated.py").exists():
            continue
        rows.append(
            (
                doctype,
                mod,
                dt_module,
                class_name(doctype),
                meta.get("sort_field") or "modified",
                meta.get("sort_order") or "DESC",
            )
        )
    return rows


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("module", nargs="?", default="pilot")
        parser.add_argument("--doctype", dest="doctype")

    def handle(self, *args, **options):
        sources = load_sources()
        wanted = [options["doctype"]] if options.get("doctype") else list(PILOT_DOCTYPES)
        auto_path = Path(settings.BASE_DIR) / "apps" / "erpnext" / "management" / "auto_doctypes.json"
        if auto_path.exists() and not options.get("doctype") and options["module"] == "pilot":
            with auto_path.open(encoding="utf-8") as handle:
                wanted.extend(name for name in json.load(handle) if name not in wanted)
        if options["module"] == "core":
            wanted = list(FRAPPE_CORE_DOCTYPES)
        if options["module"] == "hrms_stage1":
            wanted = list(HRMS_STAGE1_DOCTYPES)
        if options["module"] == "hrms":
            wanted = sorted(doctype for doctype, path in sources.items() if source_app(path) == "hrms")
        if options["module"] == "all":
            wanted = sorted(sources)

        if options["module"] in {"pilot", "hrms_stage1", "hrms"} and not options.get("doctype"):
            index = 0
            while index < len(wanted):
                with sources[wanted[index]].open(encoding="utf-8") as handle:
                    parent_meta = json.load(handle)
                for parent_field in parent_meta.get("fields", []):
                    if parent_field.get("fieldtype") in ("Table", "Table MultiSelect") and parent_field.get("options"):
                        child_name = parent_field["options"]
                        if child_name in sources and child_name not in wanted and child_name not in HAND_DEFINED:
                            wanted.append(child_name)
                index += 1
        wanted = [doctype for doctype in wanted if doctype not in HAND_DEFINED]
        missing = [doctype for doctype in wanted if doctype not in sources]
        if missing:
            raise CommandError(f"Missing source DocTypes: {', '.join(missing)}")

        target_roots = {
            "erpnext": Path(settings.BASE_DIR) / "apps" / "erpnext",
            "hrms": Path(settings.BASE_DIR) / "apps" / "hrms",
        }
        classes_by_app = {"erpnext": [], "hrms": []}
        for doctype in wanted:
            source = sources[doctype]
            app_name = "hrms" if source_app(source) == "hrms" else "erpnext"
            target_root = target_roots[app_name]
            with source.open(encoding="utf-8") as handle:
                meta = json.load(handle)
            mod = module_for(meta)
            dt_module = module_name(doctype)
            out_dir = target_root / mod / "doctype" / dt_module
            out_dir.mkdir(parents=True, exist_ok=True)
            copy_if_changed(source, out_dir / f"{dt_module}.json")
            for package_init in (out_dir / "__init__.py", out_dir.parent / "__init__.py", out_dir.parent.parent / "__init__.py"):
                if not package_init.exists():
                    package_init.write_text("", encoding="utf-8")
            controller = out_dir / f"{dt_module}.py"
            if not controller.exists():
                controller.write_text(
                    "from apps.frappe.model.document import Document\n\n\n"
                    f"class {class_name(doctype)}(Document):\n"
                    f"    doctype = {doctype!r}\n",
                    encoding="utf-8",
                )
            if meta.get("issingle"):
                continue
            fields = []
            base = "FrappeChildModel" if meta.get("istable") else "FrappeTreeModel" if meta.get("is_tree") else "FrappeModel"
            imports = "from django.db import models\n\nfrom apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel\n\n\n"
            fields.append(imports)
            fields.append(f"class {class_name(doctype)}Generated({base}):\n")
            fields.append(f"    doctype = {doctype!r}\n")
            if meta.get("is_submittable") and not any(field.get("fieldname") == "amended_from" for field in meta.get("fields", [])):
                fields.append('    amended_from = models.CharField(max_length=140, blank=True, default="")\n')
            for field in meta.get("fields", []):
                rendered = model_field(field)
                if rendered:
                    attribute = field_name(field['fieldname'])
                    if keyword.iskeyword(attribute):
                        fields.append(f"    locals()[{attribute!r}] = {rendered}\n")
                    else:
                        fields.append(f"    {attribute} = {rendered}\n")
            if meta.get("track_seen"):
                fields.append("    _seen = models.TextField(null=True, blank=True)\n")
            fields.append("\n    class Meta:\n")
            fields.append("        abstract = True\n")
            generated = out_dir / f"{dt_module}_generated.py"
            write_text_if_changed(generated, "".join(fields))
            classes_by_app[app_name].append((doctype, mod, dt_module, class_name(doctype), meta.get("sort_field") or "modified", meta.get("sort_order") or "DESC"))

        for app_name, classes in classes_by_app.items():
            classes = generated_classes(target_roots[app_name])
            if not classes:
                continue
            target_root = target_roots[app_name]
            lines = ["from django.db import models\n\n"]
            for doctype, mod, dt_module, cls, sort_field, sort_order in classes:
                lines.append(f"from apps.{app_name}.{mod}.doctype.{dt_module}.{dt_module}_generated import {cls}Generated\n")
            lines.append("\n")
            for doctype, mod, dt_module, cls, sort_field, sort_order in classes:
                ordering = f"-{sort_field}" if str(sort_order).upper() == "DESC" else sort_field
                lines.append(f"class {cls}({cls}Generated):\n")
                lines.append("    class Meta:\n")
                lines.append(f"        db_table = {('tab' + doctype)!r}\n")
                lines.append(f"        verbose_name = {doctype!r}\n")
                lines.append(f"        ordering = [{ordering!r}]\n")
                lines.append("\n\n")
            write_text_if_changed(target_root / "generated_models.py", "".join(lines))
        self.stdout.write(self.style.SUCCESS(f"Generated {sum(len(classes) for classes in classes_by_app.values())} doctypes"))
