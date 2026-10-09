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

ALREADY_DEFINED = {
    "email",
    "first_name",
    "last_name",
    "username",
    "language",
    "time_zone",
    "user_image",
    "email_signature",
    "last_login",
}

meta = json.loads((ROOT.parent / "vendor/frappe/frappe/core/doctype/user/user.json").read_text(encoding="utf-8"))
lines = [
    "from django.db import models",
    "",
    "from apps.frappe.model.base import FrappeDateTimeField, FrappeTimeField",
    "",
    "",
    "class UserFrappeFields(models.Model):",
    "    name = models.CharField(max_length=140, unique=True, null=True, blank=True)",
    "    owner = models.CharField(max_length=140, blank=True, default='')",
    "    creation = FrappeDateTimeField(null=True, blank=True)",
    "    modified = FrappeDateTimeField(null=True, blank=True)",
    "    modified_by = models.CharField(max_length=140, blank=True, default='')",
    "    docstatus = models.SmallIntegerField(default=0)",
    "    idx = models.IntegerField(default=0)",
    "    _user_tags = models.TextField(null=True, blank=True)",
    "    _comments = models.TextField(null=True, blank=True)",
    "    _assign = models.TextField(null=True, blank=True)",
    "    _liked_by = models.TextField(null=True, blank=True)",
]
seen = set()
for field in meta["fields"]:
    fieldname = field.get("fieldname")
    if not fieldname or field.get("fieldtype") in SKIP_FIELD_TYPES or field.get("fieldtype") == "Password" or fieldname in ALREADY_DEFINED or fieldname in seen:
        continue
    rendered = model_field(field)
    if not rendered:
        continue
    seen.add(fieldname)
    attribute = field_name(fieldname)
    lines.append(f"    {attribute} = {rendered}")
lines += ["", "    class Meta:", "        abstract = True", ""]
(ROOT / "apps/core/user_fields.py").write_text("\n".join(lines), encoding="utf-8")
print(len(seen), "fields")
