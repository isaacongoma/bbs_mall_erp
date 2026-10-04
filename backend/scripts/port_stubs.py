import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc

APP_ROOTS = (("erpnext", pc.TARGET["erpnext"]), ("hrms", pc.TARGET["hrms"]))
STUB_TEMPLATE_START = "from apps.frappe.model.document import Document\n"


def is_stub(path):
    text = path.read_text(encoding="utf-8")
    return text.startswith(STUB_TEMPLATE_START) and text.count("\n") <= 6


def class_name(doctype):
    import re

    return re.sub(r"[^0-9A-Za-z]", "", doctype)


def main(dry=False):
    ported = []
    skipped = []
    for app_name, app_root in APP_ROOTS:
        for controller in sorted(app_root.glob("*/doctype/*/*.py")):
            if controller.name.endswith("_generated.py") or controller.name.startswith("test_") or controller.name == "__init__.py":
                continue
            if controller.stem != controller.parent.name:
                continue
            if not is_stub(controller):
                continue
            meta_path = controller.with_suffix(".json")
            if not meta_path.exists():
                continue
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            doctype = meta["name"]
            relative = controller.relative_to(app_root).as_posix()
            if (pc.VENDOR[app_name] / relative).exists():
                if not dry:
                    pc.port(app_name, relative, doctype)
                ported.append((app_name, relative))
                continue
            frappe_relative = None
            for candidate in pc.VENDOR["frappe"].glob(f"**/doctype/{controller.parent.name}/{controller.name}"):
                frappe_relative = candidate.relative_to(pc.VENDOR["frappe"]).as_posix()
                break
            if frappe_relative:
                if not dry:
                    pc.port("frappe", frappe_relative, doctype)
                    module_path = "apps.frappe." + frappe_relative[:-3].replace("/", ".")
                    names = class_name(doctype)
                    controller.write_text(f"from {module_path} import {names}\n\n__all__ = [\"{names}\"]\n", encoding="utf-8")
                ported.append(("frappe", frappe_relative))
            else:
                skipped.append(relative)
    print(len(ported), "ported;", len(skipped), "without upstream controller")
    for item in ported:
        print(" ", item[0], item[1])
    for item in skipped:
        print("  no upstream:", item)


if __name__ == "__main__":
    main(dry="--dry" in sys.argv)