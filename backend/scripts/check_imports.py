import ast
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

missing = {}
for path in sorted((ROOT / "apps").rglob("*.py")):
    if any(part in {"migrations", "tests", "__pycache__", "scripts"} for part in path.parts) or path.name.startswith("test_"):
        continue
    if not (str(path).startswith(str(ROOT / "apps" / "erpnext")) or str(path).startswith(str(ROOT / "apps" / "frappe"))):
        continue
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError:
        continue
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module and node.level == 0 and node.module.split(".")[0] in {"erpnext", "frappe"}:
            try:
                module = importlib.import_module(node.module)
            except ModuleNotFoundError as exc:
                missing.setdefault(f"module {node.module}", set()).add(str(path.relative_to(ROOT)))
                continue
            except Exception as exc:
                missing.setdefault(f"error {node.module}: {type(exc).__name__}", set()).add(str(path.relative_to(ROOT)))
                continue
            for alias in node.names:
                if alias.name != "*" and not hasattr(module, alias.name):
                    try:
                        importlib.import_module(f"{node.module}.{alias.name}")
                    except ImportError:
                        missing.setdefault(f"{node.module}.{alias.name}", set()).add(str(path.relative_to(ROOT)))
print(len(missing))
for key in sorted(missing):
    print(key, "<-", sorted(missing[key])[0], f"(+{len(missing[key]) - 1})")
