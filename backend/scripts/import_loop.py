import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc

target_module = sys.argv[1]
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 15
for step in range(limit):
    code = (
        "import django,sys\nsys.path.insert(0,'apps')\nimport config.settings.dev\nimport importlib\nimportlib.import_module('apps.frappe')\ndjango.setup()\n"
        f"importlib.import_module('{target_module}')\nprint('IMPORT_OK')\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        env={**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings.dev"},
    )
    output = result.stdout + result.stderr
    if "IMPORT_OK" in output:
        print("import ok after", step, "ports")
        break
    output = re.sub(r"No module named 'apps\.((?:frappe|erpnext|hrms)[\w.]*)'", lambda m: "No module named '" + m.group(1) + "'", output)
    pip_match = re.search(r"No module named '([\w]+)", output)
    match = re.search(r"No module named '((?:frappe|erpnext|hrms)[\w.]*)'", output)
    if pip_match and not match:
        name = pip_match.group(1)
        package = {"PIL": "Pillow", "dateutil": "python-dateutil", "yaml": "PyYAML", "bs4": "beautifulsoup4", "magic": "python-magic", "git": "GitPython", "ldap3": "ldap3"}.get(name, name)
        print("pip install", package)
        install = subprocess.run([sys.executable, "-m", "pip", "install", "-q", package], capture_output=True, text=True)
        if install.returncode != 0:
            print(install.stderr[-300:])
            break
        with open(pc.ROOT / "backend" / "requirements" / "base.txt", "a", encoding="utf-8") as handle:
            handle.write(package + chr(10))
        continue
    if not match:
        print(output[-600:])
        break
    module = match.group(1)
    parts = module.split(".")
    app = parts[0]
    base = pc.VENDOR[app].joinpath(*parts[1:])
    relative = None
    if base.with_suffix(".py").exists():
        relative = base.with_suffix(".py").relative_to(pc.VENDOR[app]).as_posix()
    elif (base / "__init__.py").exists():
        relative = (base / "__init__.py").relative_to(pc.VENDOR[app]).as_posix()
    if relative is None:
        print("not in vendor:", module)
        print(output[-400:])
        break
    destination = pc.TARGET[app] / relative
    if destination.exists():
        print("already exists but import failed:", module)
        print(output[-600:])
        break
    pc.port(app, relative)
