import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAIRS = {
    "erpnext": (ROOT / "vendor" / "erpnext" / "erpnext", ROOT / "backend" / "apps" / "erpnext"),
    "hrms": (ROOT / "vendor" / "hrms" / "hrms", ROOT / "backend" / "apps" / "hrms"),
    "frappe": (ROOT / "vendor" / "frappe" / "frappe", ROOT / "backend" / "apps" / "frappe"),
}


def sizes(path):
    try:
        tree = ast.parse(path.read_text(encoding="utf-8").replace("\t", "    "))
    except SyntaxError:
        return None
    out = {}

    def walk(body, prefix=""):
        for node in body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                count = sum(1 for _ in ast.walk(node))
                out[prefix + node.name] = count
            elif isinstance(node, ast.ClassDef):
                walk(node.body, prefix + node.name + ".")

    walk(tree.body)
    return out


hits = []
for app, (src, dst) in PAIRS.items():
    for target in sorted(dst.rglob("*.py")):
        relative = target.relative_to(dst)
        if any(p in {"migrations", "tests", "__pycache__", "management"} for p in relative.parts) or target.name.startswith("test_"):
            continue
        source = src / relative
        if not source.exists():
            continue
        a, b = sizes(source), sizes(target)
        if not a or b is None:
            continue
        for name, size in a.items():
            if name in b and size >= 40 and b[name] * 3 < size:
                hits.append((size, b[name], f"{app}/{relative}", name))
hits.sort(reverse=True)
for size, ours, path, name in hits:
    print(f"{size:5d} -> {ours:4d}  {path}  {name}")
print(len(hits))
