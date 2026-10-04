import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc

TARGET = pc.TARGET["frappe"] / "model" / "document.py"
SOURCES = [
    (pc.VENDOR["frappe"] / "model" / "document.py", "Document"),
    (pc.VENDOR["frappe"] / "model" / "base_document.py", "BaseDocument"),
]


def main(names):
    chunks = []
    found = set()
    for path, class_name in SOURCES:
        text = path.read_text(encoding="utf-8")
        tree = ast.parse(text)
        lines = text.split("\n")
        for node in tree.body:
            if isinstance(node, ast.ClassDef) and node.name == class_name:
                for method in node.body:
                    if isinstance(method, ast.FunctionDef) and method.name in names and method.name not in found:
                        start = min([method.lineno] + [d.lineno for d in method.decorator_list]) - 1
                        chunk = "\n".join(lines[start : method.end_lineno])
                        chunks.append(chunk)
                        found.add(method.name)
    missing = set(names) - found
    if missing:
        print("not found:", sorted(missing))
    block = "\n\n".join(chunks)
    block = pc.tabs_to_spaces(block)
    block = pc.strip_comments("class _X:\n" + block).split("\n", 1)[1]
    target_text = TARGET.read_text(encoding="utf-8")
    tree = ast.parse(target_text)
    lines = target_text.split("\n")
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "Document":
            end = node.end_lineno
            lines.insert(end, "\n" + block)
            break
    result = "\n".join(lines)
    compile(result, "document.py", "exec")
    TARGET.write_text(result, encoding="utf-8")
    print("added", sorted(found))


if __name__ == "__main__":
    main(set(sys.argv[1:]))
