import ast
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract_functions as ef
import port_controller as pc


def locate(app, module_parts):
    base = pc.VENDOR[app].joinpath(*module_parts[1:])
    if base.with_suffix(".py").exists():
        return base.with_suffix(".py").relative_to(pc.VENDOR[app]).as_posix()
    if (base / "__init__.py").exists():
        return (base / "__init__.py").relative_to(pc.VENDOR[app]).as_posix()
    return None


def main(paths):
    for path in paths:
        parts = path.replace("()", "").split(".")
        app = parts[0]
        if app not in pc.VENDOR:
            continue
        found = None
        for cut in range(len(parts) - 1, 0, -1):
            relative = locate(app, parts[:cut])
            if relative:
                found = (relative, parts[cut:], parts[:cut])
                break
        if not found:
            print("not in vendor:", path)
            continue
        relative, rest, module_parts = found
        target = pc.TARGET[app] / relative
        if not target.exists():
            pc.port(app, relative)
            print("ported", relative)
        elif rest:
            source = ast.parse((pc.VENDOR[app] / relative).read_text(encoding="utf-8").replace("\t", "    "))
            names = {n.name for n in source.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name == rest[0]}
            existing = ast.parse(target.read_text(encoding="utf-8"))
            have = {n.name for n in existing.body if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
            if names and not (names & have):
                ef.extract(app, relative, names, relative)
                subprocess.run([sys.executable, str(Path(__file__).parent / "fix_undefined.py"), app, relative])


if __name__ == "__main__":
    main(sys.argv[1:])
