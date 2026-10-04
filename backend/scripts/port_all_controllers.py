import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS = ROOT / "apps" / "erpnext"
failures = {}
modules = []
for controller in sorted(APPS.glob("*/doctype/*/*.py")):
    if controller.stem != controller.parent.name:
        continue
    relative = controller.relative_to(ROOT / "apps").with_suffix("")
    modules.append(".".join(("apps",) + relative.parts))
print(len(modules), "controllers")
for module in modules:
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "import_loop.py"), module, "40"],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    output = result.stdout + result.stderr
    if "import ok" not in output:
        tail = [line for line in output.strip().splitlines() if line.strip()][-2:]
        failures[module] = " | ".join(tail)
        print("FAIL", module, failures[module], flush=True)
print(len(failures), "failing")
