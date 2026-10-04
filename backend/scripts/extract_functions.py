import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc


def extract(app, relative, names, target_relative):
    source = (pc.VENDOR[app] / relative).read_text(encoding="utf-8")
    tree = ast.parse(source)
    lines = source.split("\n")
    chunks = []
    found = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names:
            start = min([node.lineno] + [d.lineno for d in node.decorator_list]) - 1
            chunks.append("\n".join(lines[start : node.end_lineno]))
            found.add(node.name)
    missing = set(names) - found
    if missing:
        print("not found:", sorted(missing))
    text = "\n\n\n".join(chunks) + "\n"
    text = pc.tabs_to_spaces(text)
    text = pc.strip_comments(text)
    text = pc.collapse_blank_lines(text)
    compile(text, relative, "exec")
    destination = pc.TARGET[app] / target_relative
    existing = destination.read_text(encoding="utf-8") if destination.exists() else ""
    destination.write_text(existing.rstrip("\n") + "\n\n\n" + text, encoding="utf-8")
    print("appended", sorted(found), "->", destination)


if __name__ == "__main__":
    app, relative, target_relative = sys.argv[1:4]
    extract(app, relative, set(sys.argv[4:]), target_relative)
