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
import frappe

pattern = re.compile(r"\bfrappe\.([A-Za-z_]\w*)")
used = {}
for app in ("erpnext", "hrms", "frappe", "core", "crm"):
    for path in (ROOT / "apps" / app).rglob("*.py"):
        if "migrations" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in pattern.finditer(text):
            used.setdefault(match.group(1), set()).add(f"{app}/{path.name}")
missing = {}
for name, files in used.items():
    try:
        getattr(frappe, name)
    except AttributeError:
        missing[name] = files
    except Exception:
        pass
for name, files in sorted(missing.items(), key=lambda item: -len(item[1])):
    print(name, len(files), sorted(files)[:2])
print(len(missing))
