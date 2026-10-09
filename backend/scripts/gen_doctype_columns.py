import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps"))
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
import config.settings.dev  # noqa

import importlib

importlib.import_module("apps.frappe")
import django

django.setup()
from apps.erpnext.management.commands.generate_doctypes import SKIP_FIELD_TYPES, field_name, model_field
from apps.frappe import models as frappe_models

TARGETS = {
    "DocType": ("core/doctype/doctype/doctype.json", "DocTypeColumns", frappe_models.DocTypeTable),
    "DocField": ("core/doctype/docfield/docfield.json", "DocFieldColumns", frappe_models.DocFieldTable),
}
lines = ["from django.db import models", "", ""]
for label, (path, class_name, model) in TARGETS.items():
    existing = {f.name for f in model._meta.fields}
    meta = json.loads((ROOT.parent / "vendor/frappe/frappe" / path).read_text(encoding="utf-8"))
    lines.append(f"class {class_name}(models.Model):")
    seen = set()
    count = 0
    for field in meta["fields"]:
        fieldname = field.get("fieldname")
        if not fieldname or field.get("fieldtype") in SKIP_FIELD_TYPES or field.get("fieldtype") in ("Table", "Table MultiSelect"):
            continue
        attribute = field_name(fieldname)
        if attribute in existing or attribute in seen:
            continue
        rendered = model_field(field)
        if not rendered:
            continue
        seen.add(attribute)
        lines.append(f"    {attribute} = {rendered}")
        count += 1
    if not count:
        lines.append("    pass")
    lines += ["", "    class Meta:", "        abstract = True", "", ""]
    print(label, count)
(ROOT / "apps/frappe/doctype_columns.py").write_text("\n".join(lines).rstrip("\n") + "\n", encoding="utf-8")
