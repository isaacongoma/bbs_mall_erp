import ast
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc

AUTO_DOCTYPES = pc.ROOT / "backend" / "apps" / "erpnext" / "management" / "auto_doctypes.json"


def module_to_file(module):
    parts = module.split(".")
    app = parts[0]
    if app not in pc.VENDOR:
        return None
    base = pc.VENDOR[app].joinpath(*parts[1:])
    if base.with_suffix(".py").exists():
        return app, base.with_suffix(".py").relative_to(pc.VENDOR[app]).as_posix()
    if (base / "__init__.py").exists():
        return app, (base / "__init__.py").relative_to(pc.VENDOR[app]).as_posix()
    return None


def doctype_for(app, relative):
    path = pc.VENDOR[app] / relative
    parts = Path(relative).parts
    if "doctype" in parts and path.stem == path.parent.name:
        json_path = path.with_suffix(".json")
        if json_path.exists():
            meta = json.loads(json_path.read_text(encoding="utf-8"))
            return meta.get("name")
    return None


def imports_of(source):
    tree = ast.parse(source)
    found = set()
    for node in tree.body:
        if isinstance(node, ast.Import):
            for alias in node.names:
                found.add(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            found.add(node.module)
            for alias in node.names:
                found.add(f"{node.module}.{alias.name}")
    return found


def run(roots, limit=400, dry_run=False, skip=()):
    queue = list(roots)
    seen = set()
    ported = []
    new_doctypes = []
    while queue and len(ported) < limit:
        module = queue.pop(0)
        if module in seen:
            continue
        seen.add(module)
        located = module_to_file(module)
        if not located:
            continue
        app, relative = located
        if app != "erpnext":
            continue
        if any(module.startswith(prefix) for prefix in skip):
            continue
        destination = pc.TARGET[app] / relative
        source_text = (pc.VENDOR[app] / relative).read_text(encoding="utf-8")
        for dependency in imports_of(source_text):
            if dependency not in seen:
                queue.append(dependency)
        if destination.exists():
            continue
        doctype = doctype_for(app, relative)
        if not dry_run:
            pc.port(app, relative, doctype)
        ported.append(f"{app}/{relative}")
        if doctype:
            new_doctypes.append(doctype)
    if not dry_run and new_doctypes:
        existing = json.loads(AUTO_DOCTYPES.read_text(encoding="utf-8")) if AUTO_DOCTYPES.exists() else []
        for name in new_doctypes:
            if name not in existing:
                existing.append(name)
        AUTO_DOCTYPES.write_text(json.dumps(existing, indent=1), encoding="utf-8")
    return ported, new_doctypes, queue


if __name__ == "__main__":
    dry = "--dry" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ported, doctypes, remaining = run(args, dry_run=dry)
    print(len(ported), "files;", len(doctypes), "doctypes")
    for item in ported:
        print(" ", item)
