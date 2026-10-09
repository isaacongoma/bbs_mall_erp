import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc


def methods_source(app, relative, class_name, names):
    source = pc.tabs_to_spaces((pc.VENDOR[app] / relative).read_text(encoding="utf-8"))
    tree = ast.parse(source)
    lines = source.split("\n")
    chunks = []
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name in names:
                    start = min([item.lineno] + [d.lineno for d in item.decorator_list]) - 1
                    chunks.append("\n".join(lines[start : item.end_lineno]))
    text = "\n\n".join(chunks)
    return pc.strip_comments(text)


def insert_into_class(target, class_name, text, replace_names):
    source = target.read_text(encoding="utf-8")
    tree = ast.parse(source)
    lines = source.split("\n")
    drop = set()
    end = None
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            end = node.end_lineno
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name in replace_names:
                    start = min([item.lineno] + [d.lineno for d in item.decorator_list]) - 1
                    drop.update(range(start, item.end_lineno))
    kept = [line for index, line in enumerate(lines) if index not in drop]
    shift = len([i for i in drop if i < (end or 0)])
    position = (end or len(kept)) - shift
    kept[position:position] = ["", *text.split("\n")]
    target.write_text("\n".join(kept), encoding="utf-8")


if __name__ == "__main__":
    app, relative, class_name, target_file = sys.argv[1:5]
    names = set(sys.argv[5:])
    text = methods_source(app, relative, class_name, names)
    insert_into_class(Path(target_file), sys.argv[3] if len(sys.argv) < 0 else "Meta", text, names)
    print("inserted", sorted(names))
