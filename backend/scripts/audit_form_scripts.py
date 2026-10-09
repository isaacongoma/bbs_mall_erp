import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = sys.argv[1] if len(sys.argv) > 1 else "erpnext"
VENDOR = ROOT / "vendor" / APP / APP
PORTED = ROOT / "frontend" / "src" / "modules" / APP / "doctypes"

EVENT = re.compile(r"^\t(?:async\s+)?([A-Za-z_][\w]*)\s*(?::\s*(?:async\s+)?function|\()", re.M)
BUTTON = re.compile(r"add_custom_button|add_inner_button")
rows = []
for js in sorted(VENDOR.rglob("*.js")):
    if "doctype" not in js.parts or js.name.startswith("test_") or "public" in js.parts:
        continue
    text = js.read_text(encoding="utf-8", errors="ignore")
    handlers = len(EVENT.findall(text))
    ported = PORTED / js.stem / "form.ts"
    ported_lines = len(ported.read_text(encoding="utf-8").splitlines()) if ported.exists() else 0
    rows.append((js.stem, len(text.splitlines()), handlers, len(BUTTON.findall(text)), ported_lines))
done = [r for r in rows if r[4]]
print(f"{len(rows)} original doctype scripts, {sum(r[1] for r in rows)} lines, {sum(r[3] for r in rows)} custom buttons")
print(f"{len(done)} have a port ({sum(r[4] for r in done)} lines for {sum(r[1] for r in done)} original lines)")
thin = [r for r in done if r[4] < r[1] * 0.45]
print(f"{len(thin)} of the ported scripts are below 45 percent of the original size")
print("missing, largest first:")
for r in sorted((r for r in rows if not r[4]), key=lambda r: -r[1])[:25]:
    print(f"  {r[0]:40s} {r[1]:5d} lines {r[3]:3d} buttons")
