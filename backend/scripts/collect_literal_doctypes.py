import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import add_doctypes

EXCLUDE = {"Role", "Has Role", "User", "DocField", "DocType", "DocPerm", "User Permission", "Singles", "DocShare", "Custom DocPerm", "Website Settings", "Web Form", "Web Page", "Blog Post", "Contact Us Settings", "Server Script", "Client Script", "RQ Job"}
known = add_doctypes.vendor_doctypes()
pattern = re.compile(r"[\"']([A-Z][A-Za-z0-9 /&\-]{2,60})[\"']")
found = set()
for path in (ROOT / "apps" / "erpnext").rglob("*.py"):
    if "migrations" in path.parts or "tests" in path.parts or path.name.startswith("test_") or path.name.endswith("_generated.py") or path.name == "generated_models.py":
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for match in pattern.findall(text):
        if match in known and match not in EXCLUDE:
            found.add(match)
print(len(found))
add_doctypes.main(sorted(found))
