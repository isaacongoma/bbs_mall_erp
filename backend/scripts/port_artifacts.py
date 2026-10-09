import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc

ARTIFACT_DIRS = {
    "report": {".json", ".html"},
    "print_format": {".json"},
    "dashboard_chart": {".json"},
    "number_card": {".json"},
    "notification": {".json"},
    "workspace": {".json"},
    "workspace_sidebar": {".json"},
    "desktop_icon": {".json"},
    "onboarding_step": {".json"},
    "module_onboarding": {".json"},
    "page": {".json"},
    "form_tour": {".json"},
    "web_form": {".json"},
    "dashboard": {".json"},
    "custom_html_block": {".json"},
    "print_style": {".json"},
    "sidebar": {".json"},
    "web_template": {".json"},
    "email_template": {".json"},
}


def copy_artifacts(app):
    source_root = pc.VENDOR[app]
    target_root = pc.TARGET[app]
    copied = 0
    for path in sorted(source_root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(source_root)
        parts = relative.parts
        if "doctype" in parts or "public" in parts or "patches" in parts or path.name.startswith("test_"):
            continue
        kind = next((part for part in parts[:-2] if part in ARTIFACT_DIRS), None)
        if kind is None or path.suffix not in ARTIFACT_DIRS[kind]:
            continue
        target = target_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        copied += 1
    print(app, "copied", copied)


if __name__ == "__main__":
    for name in sys.argv[1:] or ["frappe", "erpnext", "hrms"]:
        copy_artifacts(name)
