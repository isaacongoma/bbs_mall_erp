import ast
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import extract_methods as em
import port_controller as pc


def find_source(app, relative, class_names, names):
    chunks = {}
    for relative_path, class_name in class_names:
        text = em.methods_source(app, relative_path, class_name, names)
        source = pc.tabs_to_spaces((pc.VENDOR[app] / relative_path).read_text(encoding="utf-8"))
        tree = ast.parse(source)
        for node in tree.body:
            if isinstance(node, ast.ClassDef) and node.name == class_name:
                for item in node.body:
                    if isinstance(item, ast.FunctionDef) and item.name in names and item.name not in chunks:
                        chunks[item.name] = em.methods_source(app, relative_path, class_name, {item.name})
    return chunks


def main(app, target_relative, target_class, names):
    if target_class == "Database":
        pairs = [("database/database.py", "Database")]
    else:
        pairs = [("model/document.py", "Document"), ("model/base_document.py", "BaseDocument")]
    chunks = find_source(app, target_relative, pairs, set(names))
    missing = set(names) - set(chunks)
    if missing:
        print("not found upstream:", sorted(missing))
    target = pc.TARGET[app] / target_relative
    em.insert_into_class(target, target_class, "\n\n".join(chunks.values()), set(chunks))
    print("replaced", sorted(chunks))
    subprocess.run([sys.executable, str(Path(__file__).parent / "fix_undefined.py"), app, target_relative])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
