import ast
import sys

for path in sys.argv[1:]:
    text = open(path, encoding="utf-8").read()
    tree = ast.parse(text)
    lines = text.split("\n")
    seen = set()
    drop = set()
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            key = ast.dump(node)
            if key in seen:
                drop.update(range(node.lineno - 1, node.end_lineno))
            seen.add(key)
    open(path, "w", encoding="utf-8").write("\n".join(l for i, l in enumerate(lines) if i not in drop))
    print(path, len(drop))
