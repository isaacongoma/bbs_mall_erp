import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
test = sys.argv[1]
for step in range(int(sys.argv[2]) if len(sys.argv) > 2 else 20):
    result = subprocess.run(
        [sys.executable, "manage.py", "test", "--noinput", test],
        capture_output=True,
        text=True,
        cwd=ROOT,
    )
    output = result.stdout + result.stderr
    if "\nOK" in output:
        print("test passes")
        break
    name_error = re.search(r"NameError: name '(\w+)' is not defined", output)
    if name_error:
        missing_name = name_error.group(1)
        data_text = (ROOT / "apps" / "frappe" / "utils" / "data.py").read_text(encoding="utf-8")
        if re.search(rf"^(def|class) {missing_name}|^{missing_name} =", data_text, re.M):
            target = ROOT / "apps" / "frappe" / "model" / "document.py"
            text = target.read_text(encoding="utf-8")
            anchor = "from apps.frappe.utils.data import cast_fieldtype" + chr(10)
            text = text.replace(anchor, anchor + "from apps.frappe.utils.data import " + missing_name + chr(10), 1)
            target.write_text(text, encoding="utf-8")
            print("imported", missing_name)
            continue
        print(output[-1200:])
        break
    match = re.search(r"AttributeError: '\w+' object has no attribute '(\w+)'", output)
    if not match:
        lines = [l for l in output.splitlines() if "Error" in l or "File \"D:" in l and "apps" in l]
        print("\n".join(lines[-8:]))
        break
    name = match.group(1)
    add = subprocess.run([sys.executable, "scripts/add_document_methods.py", name], capture_output=True, text=True, cwd=ROOT)
    print(name, add.stdout.strip()[-80:])
    if "not found" in add.stdout:
        print(output[-1500:])
        break
