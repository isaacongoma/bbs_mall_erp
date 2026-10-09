import importlib
import os
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
import config.settings.dev  # noqa

importlib.import_module("apps.frappe")
import django

django.setup()

SKIP_PARTS = {"migrations", "tests", "__pycache__", "management", "templates", "public"}
apps = sys.argv[1:] or ["erpnext", "hrms"]
failures = []
count = 0
for app in apps:
    for path in sorted((ROOT / "apps" / app).rglob("*.py")):
        if SKIP_PARTS & set(path.parts) or path.name.startswith("test_") or path.name == "__init__.py":
            continue
        module = ".".join(path.relative_to(ROOT).with_suffix("").parts)
        count += 1
        try:
            importlib.import_module(module)
        except BaseException as error:
            last = traceback.format_exception_only(type(error), error)[-1].strip()
            failures.append((module, last))
print(count, "modules,", len(failures), "failing")
for module, error in failures:
    print("FAIL", module.replace("apps.", "", 1), "|", error[:200])
