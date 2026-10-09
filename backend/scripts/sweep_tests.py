import importlib
import os
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps"))
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
import config.settings.dev  # noqa

importlib.import_module("apps.frappe")
import django

django.setup()

areas = sys.argv[1:] or ["erpnext", "hrms"]
failures = {}
count = 0
for app in areas:
    for path in sorted((ROOT / "apps" / app).rglob("test_*.py")):
        rel = path.relative_to(ROOT / "apps").with_suffix("")
        name = ".".join(rel.parts)
        count += 1
        try:
            importlib.import_module(name)
        except BaseException as exc:
            failures[name] = f"{type(exc).__name__}: {str(exc)[:160]}"
print(count, len(failures))
for k, v in sorted(failures.items()):
    print(k, v)
for key, value in failures.items():
    print(key, "<-", value)
