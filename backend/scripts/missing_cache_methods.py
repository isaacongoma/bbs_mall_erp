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
from apps.frappe.runtime import Cache

pattern = re.compile(r"\b(?:cache|cache\(\)|client_cache|cache_client)\.([A-Za-z_]\w*)")
used = {}
for app in ("erpnext", "hrms", "frappe", "core", "crm"):
    for path in (ROOT / "apps" / app).rglob("*.py"):
        if "migrations" in path.parts:
            continue
        for match in pattern.finditer(path.read_text(encoding="utf-8", errors="ignore")):
            used.setdefault(match.group(1), set()).add(f"{app}/{path.name}")
for name in sorted(used, key=lambda n: -len(used[n])):
    if not hasattr(Cache, name):
        print(name, len(used[name]), sorted(used[name])[:2])
