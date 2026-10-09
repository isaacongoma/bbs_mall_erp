import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAIRS = {"erpnext": (ROOT / "vendor" / "erpnext" / "erpnext", ROOT / "backend" / "apps" / "erpnext"),
         "hrms": (ROOT / "vendor" / "hrms" / "hrms", ROOT / "backend" / "apps" / "hrms"),
         "frappe": (ROOT / "vendor" / "frappe" / "frappe", ROOT / "backend" / "apps" / "frappe")}


class Normalizer(ast.NodeTransformer):
    def visit_Expr(self, node):
        if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
            return None
        return self.generic_visit(node)

    def visit_ImportFrom(self, node):
        return None

    def visit_Import(self, node):
        return None

    def visit_Pass(self, node):
        return None

    def visit_AnnAssign(self, node):
        return self.generic_visit(node)


def functions(path):
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError:
        return None
    result = {}

    def walk(body, prefix=""):
        for node in body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                clone = ast.parse(ast.unparse(node)).body[0]
                clone.decorator_list = []
                clone.returns = None
                for arg in clone.args.args + clone.args.kwonlyargs + clone.args.posonlyargs:
                    arg.annotation = None
                body_nodes = Normalizer().visit(clone)
                ast.fix_missing_locations(body_nodes)
                result[prefix + node.name] = ast.dump(body_nodes)
            elif isinstance(node, ast.ClassDef):
                walk(node.body, prefix + node.name + ".")
    walk(tree.body)
    return result


app = sys.argv[1]
source_root, target_root = PAIRS[app]
rows = []
for target in sorted(target_root.rglob("*.py")):
    relative = target.relative_to(target_root)
    if any(part in {"migrations", "tests", "__pycache__", "management"} for part in relative.parts) or target.name.endswith("_generated.py"):
        continue
    source = source_root / relative
    if not source.exists():
        continue
    a, b = functions(source), functions(target)
    if a is None or b is None:
        continue
    missing = sorted(set(a) - set(b))
    changed = sorted(name for name in set(a) & set(b) if a[name] != b[name])
    extra = sorted(set(b) - set(a))
    if missing or changed or extra:
        rows.append((len(missing) + len(changed) + len(extra), str(relative), missing, changed, extra))
rows.sort(reverse=True)
print(len(rows), "modules differ")
for total, relative, missing, changed, extra in rows[: int(sys.argv[2]) if len(sys.argv) > 2 else 60]:
    print(f"{total:4d} {relative} missing={len(missing)} changed={len(changed)} extra={len(extra)}")
    if "--detail" in sys.argv:
        print("     missing:", missing[:8], "changed:", changed[:8], "extra:", extra[:8])
