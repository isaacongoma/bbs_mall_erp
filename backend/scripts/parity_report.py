import ast
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "vendor" / "erpnext" / "erpnext"
TARGET = ROOT / "backend" / "apps" / "erpnext"
CLIENT = ROOT / "frontend" / "src" / "modules" / "erpnext"
SKIP = {"__pycache__", "migrations", "patches", "tests", "locale", "node_modules"}
MODULES = [
    "accounts", "assets", "buying", "selling", "stock", "manufacturing", "projects", "support", "crm",
    "quality_management", "subcontracting", "setup", "maintenance", "utilities", "communication",
    "telephony", "portal", "edi", "bulk_transaction", "erpnext_integrations", "regional", "controllers",
]


def normalized_functions(path):
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (SyntaxError, UnicodeDecodeError):
        return None
    found = {}

    def clean(node):
        clone = ast.parse(ast.unparse(node)).body[0]
        clone.decorator_list = []
        clone.returns = None
        for arg in clone.args.args + clone.args.kwonlyargs + clone.args.posonlyargs:
            arg.annotation = None

        class Strip(ast.NodeTransformer):
            def visit_Expr(self, n):
                if isinstance(n.value, ast.Constant) and isinstance(n.value.value, str):
                    return None
                return self.generic_visit(n)

            def visit_Pass(self, n):
                return None

        stripped = Strip().visit(clone)
        ast.fix_missing_locations(stripped)
        return ast.dump(stripped)

    def walk(body, prefix=""):
        for node in body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                found[prefix + node.name] = clean(node)
            elif isinstance(node, ast.ClassDef):
                walk(node.body, prefix + node.name + ".")

    walk(tree.body)
    return found


def relevant(path):
    return not any(part in SKIP for part in path.parts)


def python_parity(module):
    root = SOURCE / module
    files = [p for p in root.rglob("*.py") if relevant(p.relative_to(SOURCE)) and p.name != "__init__.py"]
    totals = dict(files=0, missing_file=0, same=0, functions=0, identical=0, changed=0, missing=0)
    worst = []
    for source in files:
        relative = source.relative_to(SOURCE)
        target = TARGET / relative
        totals["files"] += 1
        a = normalized_functions(source)
        if not target.exists():
            totals["missing_file"] += 1
            if a:
                totals["functions"] += len(a)
                totals["missing"] += len(a)
            continue
        b = normalized_functions(target)
        if a is None or b is None:
            continue
        totals["functions"] += len(a)
        miss = [n for n in a if n not in b]
        diff = [n for n in a if n in b and a[n] != b[n]]
        totals["missing"] += len(miss)
        totals["changed"] += len(diff)
        totals["identical"] += len(a) - len(miss) - len(diff)
        if not miss and not diff:
            totals["same"] += 1
        else:
            worst.append((len(miss) + len(diff), str(relative), len(miss), len(diff)))
    worst.sort(reverse=True)
    return totals, worst


def json_files(root, kind):
    return {p.parent.name: p for p in root.rglob("*.json") if f"/{kind}/" in p.as_posix() and p.stem == p.parent.name}


def field_signature(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    return {f.get("fieldname"): (f.get("fieldtype"), f.get("options"), f.get("reqd", 0), f.get("hidden", 0)) for f in data.get("fields", [])}


def meta_parity(module, kind):
    source = json_files(SOURCE / module, kind)
    target = json_files(TARGET / module, kind)
    missing = sorted(set(source) - set(target))
    same = changed = 0
    differing = []
    if kind == "doctype":
        for name in set(source) & set(target):
            a, b = field_signature(source[name]), field_signature(target[name])
            if a is None or b is None:
                continue
            if a == b:
                same += 1
            else:
                changed += 1
                lost = sorted(set(a) - set(b))
                differing.append((len(lost) + len([k for k in a if k in b and a[k] != b[k]]), name))
    else:
        same = len(set(source) & set(target))
    differing.sort(reverse=True)
    return dict(source=len(source), missing=missing, same=same, changed=changed, differing=differing)


def client_parity(module):
    root = SOURCE / module
    scripts = [p for p in root.rglob("*.js") if relevant(p.relative_to(SOURCE)) and not p.name.endswith(".min.js") and "test" not in p.name]
    missing = [str(p.relative_to(SOURCE)) for p in scripts if not (CLIENT / p.relative_to(SOURCE).with_suffix(".ts")).exists()]
    return len(scripts), missing


def main():
    detail = "--detail" in sys.argv
    wanted = [a for a in sys.argv[1:] if not a.startswith("--")] or MODULES
    out = {}
    print(f"{'module':22} {'py files':>8} {'py fn':>6} {'identical':>9} {'changed':>8} {'missing':>8} | {'dt src':>6} {'dt miss':>7} {'dt diff':>7} | {'rpt src':>7} {'rpt miss':>8} | {'js':>4} {'js miss':>7}")
    for module in wanted:
        if not (SOURCE / module).exists():
            continue
        py, worst = python_parity(module)
        dt = meta_parity(module, "doctype")
        rp = meta_parity(module, "report")
        js, js_missing = client_parity(module)
        out[module] = dict(py=py, doctype=dt, report=rp, js=js, js_missing=js_missing, worst=worst[:15])
        print(f"{module:22} {py['files']:8d} {py['functions']:6d} {py['identical']:9d} {py['changed']:8d} {py['missing']:8d} | {dt['source']:6d} {len(dt['missing']):7d} {dt['changed']:7d} | {rp['source']:7d} {len(rp['missing']):8d} | {js:4d} {len(js_missing):7d}")
        if detail:
            for total, name, miss, diff in worst[:10]:
                print(f"      py {total:3d} {name} missing={miss} changed={diff}")
            for name in dt["missing"][:10]:
                print(f"      doctype missing: {name}")
            for count, name in dt["differing"][:5]:
                print(f"      doctype fields differ ({count}): {name}")
            for name in rp["missing"][:10]:
                print(f"      report missing: {name}")
            for name in js_missing[:6]:
                print(f"      js not ported: {name}")
    Path(ROOT / "docs" / "reference" / "parity_report.json").write_text(json.dumps(out, indent=1), encoding="utf-8")


main()
