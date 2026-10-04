import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
pattern = re.compile(
    r"frappe\.(?:db\.(?:delete|get_value|exists|count|get_all|get_list|set_value|get_values|get_single_value|set_single_value)|get_doc|new_doc|get_all|get_list|get_cached_value|get_cached_doc|get_last_doc|delete_doc|get_meta)\(\s*[\"']([A-Z][A-Za-z0-9 /&\-]+)[\"']"
)
qb = re.compile(r"(?:qb|frappe\.qb)\.DocType\(\s*[\"']([A-Z][A-Za-z0-9 /&\-]+)[\"']\)")
names = set()
for path in (ROOT / "apps" / "erpnext").rglob("*.py"):
    if "migrations" in path.parts or "tests" in path.parts or path.name.startswith("test_") or path.name.endswith("_generated.py") or path.name == "generated_models.py":
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    names.update(pattern.findall(text))
    names.update(qb.findall(text))
print(len(names))
subprocess.run([sys.executable, str(ROOT / "scripts" / "add_doctypes.py"), *sorted(names)])
