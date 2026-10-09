import ast
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
from apps.frappe.runtime import Database

pattern = re.compile(r"\bdb\.([A-Za-z_]\w*)")
used = {}
for app in ("erpnext", "hrms", "frappe", "core", "crm"):
    for path in (ROOT / "apps" / app).rglob("*.py"):
        if "migrations" in path.parts:
            continue
        for match in pattern.finditer(path.read_text(encoding="utf-8", errors="ignore")):
            used.setdefault(match.group(1), set()).add(f"{app}/{path.name}")

up = ast.parse((ROOT.parent / "vendor/frappe/frappe/database/database.py").read_text(encoding="utf-8").replace("\t", "    "))
upstream = {}
for node in up.body:
    if isinstance(node, ast.ClassDef) and node.name == "Database":
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                upstream[item.name] = item
missing = [name for name in used if not hasattr(Database, name)]
for name in sorted(missing, key=lambda n: -len(used[n])):
    print(name, len(used[name]), "upstream" if name in upstream else "-")
