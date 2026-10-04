import ast
import io
import sys
import tokenize
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VENDOR = {"erpnext": ROOT / "vendor" / "erpnext" / "erpnext", "frappe": ROOT / "vendor" / "frappe" / "frappe", "hrms": ROOT / "vendor" / "hrms" / "hrms"}
TARGET = {"erpnext": ROOT / "backend" / "apps" / "erpnext", "frappe": ROOT / "backend" / "apps" / "frappe", "hrms": ROOT / "backend" / "apps" / "hrms"}


def strip_comments(source):
    lines = source.split("\n")
    drop = set()
    for token in tokenize.generate_tokens(io.StringIO(source).readline):
        if token.type == tokenize.COMMENT:
            row, col = token.start
            text = lines[row - 1]
            if text[:col].strip() == "":
                drop.add(row - 1)
            else:
                lines[row - 1] = text[:col].rstrip()
    return "\n".join(line for index, line in enumerate(lines) if index not in drop)


def remove_type_checking(source):
    tree = ast.parse(source)
    drop = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.If) and isinstance(node.test, ast.Name) and node.test.id == "TYPE_CHECKING":
            drop.update(range(node.lineno - 1, node.end_lineno))
        if isinstance(node, ast.ImportFrom) and node.module == "typing" and [a.name for a in node.names] == ["TYPE_CHECKING"]:
            drop.update(range(node.lineno - 1, node.end_lineno))
    lines = source.split(chr(10))
    pass_lines = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            body_ranges = [set(range(child.lineno - 1, child.end_lineno)) for child in node.body]
            if body_ranges and all(r <= drop for r in body_ranges):
                first = min(min(r) for r in body_ranges)
                indent = len(lines[first]) - len(lines[first].lstrip())
                pass_lines[first] = " " * indent + "pass"
    out = []
    for index, line in enumerate(lines):
        if index in pass_lines:
            out.append(pass_lines[index])
        elif index not in drop:
            out.append(line)
    return chr(10).join(out)


def tabs_to_spaces(source):
    out = []
    for line in source.split("\n"):
        stripped = line.lstrip("\t")
        out.append("    " * (len(line) - len(stripped)) + stripped)
    return "\n".join(out)


def add_doctype_attribute(source, doctype):
    tree = ast.parse(source)
    lines = source.split("\n")
    inserts = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and any(
            (isinstance(base, ast.Name) and base.id in {"Document", "NestedSet"})
            or (isinstance(base, ast.Attribute) and base.attr in {"Document", "NestedSet"})
            for base in node.bases
        ):
            if any(isinstance(item, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "doctype" for t in item.targets) for item in node.body):
                continue
            first = node.body[0]
            if isinstance(first, ast.Pass):
                first = node.body[0]
            if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant):
                inserts.append(first.end_lineno)
            else:
                decorators = getattr(first, "decorator_list", [])
                inserts.append(min([first.lineno] + [d.lineno for d in decorators]) - 1)
            break
    for index in sorted(inserts, reverse=True):
        lines.insert(index, f"    doctype = {doctype!r}\n")
    return "\n".join(lines)


def add_future_annotations(source):
    tree = ast.parse(source)
    lines = source.split(chr(10))
    index = 0
    if tree.body and isinstance(tree.body[0], ast.Expr) and isinstance(tree.body[0].value, ast.Constant) and isinstance(tree.body[0].value.value, str):
        index = tree.body[0].end_lineno
    lines.insert(index, "from __future__ import annotations")
    return chr(10).join(lines)


def collapse_blank_lines(source):
    out = []
    blank = 0
    for line in source.split("\n"):
        if line.strip() == "":
            blank += 1
            if blank > 2:
                continue
        else:
            blank = 0
        out.append(line.rstrip())
    return "\n".join(out).strip() + "\n"


def port(app, relative, doctype=None, target_relative=None):
    source = (VENDOR[app] / relative).read_text(encoding="utf-8")
    source = tabs_to_spaces(source)
    source = remove_type_checking(source)
    source = strip_comments(source)
    if doctype:
        source = add_doctype_attribute(source, doctype)
    if "from __future__ import annotations" not in source and any(
        marker in source for marker in ('" |', "| None", "None |")
    ):
        source = add_future_annotations(source)
    source = collapse_blank_lines(source)
    compile(source, relative, "exec")
    destination = TARGET[app] / (target_relative or relative)
    destination.parent.mkdir(parents=True, exist_ok=True)
    for parent in [destination.parent, *destination.parent.parents]:
        if parent == TARGET[app]:
            break
        init = parent / "__init__.py"
        if not init.exists():
            init.write_text("", encoding="utf-8")
    destination.write_text(source, encoding="utf-8")
    print(f"ported {app}/{relative} -> {destination}")


if __name__ == "__main__":
    args = sys.argv[1:]
    app, relative = args[0], args[1]
    doctype = args[2] if len(args) > 2 else None
    port(app, relative, doctype)
