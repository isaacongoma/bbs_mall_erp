import importlib
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps"))
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
import config.settings.dev  # noqa

importlib.import_module("apps.frappe")
import django

django.setup()
import frappe

SKIP = {"app_name", "app_title", "app_publisher", "app_description", "app_email", "app_license", "app_version"}


def walk(value):
    if isinstance(value, str):
        if value.count(".") >= 2 and " " not in value and "/" not in value and not value.startswith(("http", ".")):
            yield value
    elif isinstance(value, dict):
        for key, item in value.items():
            if isinstance(key, str):
                yield from walk(key)
            yield from walk(item)
    elif isinstance(value, (list, tuple, set)):
        for item in value:
            yield from walk(item)


bad = {}
hooks = frappe.get_hooks()
for key, value in hooks.items():
    if key in SKIP:
        continue
    for path in walk(value):
        head = path.split(".")[0]
        if head not in ("frappe", "erpnext", "hrms"):
            continue
        try:
            frappe.get_attr(path)
        except Exception as exc:
            bad[path] = f"{key}: {type(exc).__name__}: {str(exc)[:90]}"
for path, why in sorted(bad.items()):
    print(path, "<-", why)
print(len(bad))
