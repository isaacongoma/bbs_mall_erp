import ast
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract_functions as ef
import port_controller as pc


def remove_functions(target, names):
    source = target.read_text(encoding="utf-8")
    tree = ast.parse(source)
    lines = source.split("\n")
    drop = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name in names:
            start = min([node.lineno] + [d.lineno for d in node.decorator_list]) - 1
            drop.update(range(start, node.end_lineno))
    target.write_text("\n".join(line for index, line in enumerate(lines) if index not in drop), encoding="utf-8")


def main(app, relative, names):
    target = pc.TARGET[app] / relative
    remove_functions(target, names)
    ef.extract(app, relative, set(names), relative)
    subprocess.run([sys.executable, str(Path(__file__).parent / "fix_undefined.py"), app, relative])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
