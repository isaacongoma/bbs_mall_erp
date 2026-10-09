import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps"))
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
import config.settings.dev  # noqa

import importlib

importlib.import_module("apps.frappe")
import django

django.setup()
from apps.erpnext.registry import get_meta

pattern = re.compile(
    r"(?:get_all|get_list|get_doc|new_doc|get_cached_doc|get_last_doc|exists|get_value|get_single_value|set_value|get_cached_value|delete_doc|count|get_meta|get_lazy_doc|db\.delete|db\.get_values|qb\.DocType)\(\s*[\"']([A-Z][A-Za-z0-9 \-&/]+)[\"']"
)
found = {}
for app in ("erpnext", "hrms", "frappe"):
    for path in (ROOT / "apps" / app).rglob("*.py"):
        if "migrations" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in pattern.finditer(text):
            found.setdefault(match.group(1), set()).add(f"{app}/{path.name}")
missing = {}
for name, files in sorted(found.items()):
    try:
        get_meta(name)
    except KeyError:
        missing[name] = files
for name, files in missing.items():
    print(name, len(files), sorted(files)[:2])
print(len(missing))
