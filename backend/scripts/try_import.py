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
for name in sys.argv[1:]:
    try:
        importlib.import_module(name)
        print("OK", name)
    except BaseException:
        print("FAIL", name)
        print("".join(traceback.format_exc().splitlines(True)[-3:]))
