import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc


def names(path):
    tree = ast.parse(path.read_text(encoding="utf-8").replace("\t", "    "))
    out = {}
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
            out[node.name] = node
            if isinstance(node, ast.ClassDef):
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        out[f"{node.name}.{item.name}"] = item
    return out


app = sys.argv[1]
total = 0
for rel in sys.argv[2:]:
    up = names(pc.VENDOR[app] / rel)
    ours = names(pc.TARGET[app] / rel)
    missing = [n for n in up if n not in ours]
    total += len(missing)
    print(rel, "missing:", missing)
print(total)
