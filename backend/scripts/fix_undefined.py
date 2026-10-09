import ast
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc


def undefined(path):
    result = subprocess.run([sys.executable, "-m", "pyflakes", str(path)], capture_output=True, text=True)
    return sorted(set(re.findall(r"undefined name '([^']+)'", result.stdout)))


def fix(app, relative):
    target = pc.TARGET[app] / relative
    names = undefined(target)
    if not names:
        print("clean", relative)
        return
    source = pc.tabs_to_spaces((pc.VENDOR[app] / relative).read_text(encoding="utf-8"))
    tree = ast.parse(source)
    lines = source.split("\n")
    imports = []
    consts = []
    unresolved = set(names)
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)) and getattr(node, "module", None) != "__future__":
            bound = {(a.asname or a.name).split(".")[0] for a in node.names}
            if bound & unresolved:
                imports.append("\n".join(lines[node.lineno - 1 : node.end_lineno]))
                unresolved -= bound
        elif isinstance(node, (ast.Assign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            bound = {t.id for t in targets if isinstance(t, ast.Name)}
            if bound & unresolved:
                consts.append("\n".join(lines[node.lineno - 1 : node.end_lineno]))
                unresolved -= bound
    body = target.read_text(encoding="utf-8")
    header = pc.strip_comments("\n".join(imports))
    const_block = pc.strip_comments("\n".join(consts))
    funcs = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name in unresolved:
            start = min([node.lineno] + [d.lineno for d in node.decorator_list]) - 1
            funcs.append("\n".join(lines[start : node.end_lineno]))
            unresolved.discard(node.name)
    if funcs:
        const_block = (const_block + "\n\n\n" if const_block else "") + pc.strip_comments("\n\n\n".join(funcs))
    if header:
        body_lines = body.split("\n")
        at = 0
        while at < len(body_lines) and body_lines[at].startswith("from __future__"):
            at += 1
        body = "\n".join(body_lines[:at] + [header] + body_lines[at:])
        header = ""
    out = (header + "\n" if header else "") + body
    if const_block:
        out = out.rstrip("\n") + "\n\n\n" + const_block + "\n"
    target.write_text(pc.collapse_blank_lines(out), encoding="utf-8")
    print("fixed", relative, "unresolved:", sorted(unresolved))


if __name__ == "__main__":
    fix(sys.argv[1], sys.argv[2])
