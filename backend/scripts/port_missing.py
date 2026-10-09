import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import port_controller as pc


def doctype_for(app, relative):
    path = pc.VENDOR[app] / relative
    sibling = path.with_suffix(".json")
    if sibling.exists():
        try:
            meta = json.loads(sibling.read_text(encoding="utf-8"))
        except ValueError:
            return None
        if isinstance(meta, dict) and meta.get("doctype") == "DocType":
            return meta["name"]
    return None


def is_stub(target):
    text = target.read_text(encoding="utf-8")
    return text.count("\n") <= 6 and "Document):" in text


def main(apps):
    ported = []
    failed = []
    for app in apps:
        base = pc.VENDOR[app]
        for path in sorted(base.rglob("*.py")):
            relative = path.relative_to(base).as_posix()
            if "/patches/" in f"/{relative}" or relative.startswith("patches"):
                continue
            name = path.name
            if name == "__init__.py" or name.startswith("test_"):
                continue
            target = pc.TARGET[app] / relative
            if target.exists() and not is_stub(target):
                continue
            try:
                pc.port(app, relative, doctype_for(app, relative))
                ported.append(f"{app}/{relative}")
            except Exception as exc:
                failed.append((f"{app}/{relative}", f"{type(exc).__name__}: {exc}"))
    print(len(ported), "ported", len(failed), "failed")
    for item in failed:
        print("FAILED", *item)


if __name__ == "__main__":
    main(sys.argv[1:] or ["erpnext", "hrms"])
