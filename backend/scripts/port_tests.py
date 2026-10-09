import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import port_controller as pc

app = sys.argv[1]
skip_modules = set(sys.argv[2:])
source_root = pc.VENDOR[app]
target_root = pc.TARGET[app]
ported = copied = skipped = 0
for path in sorted(source_root.rglob("*")):
    if not path.is_file():
        continue
    name = path.name
    is_test_py = name.startswith("test_") and name.endswith(".py")
    is_records = name in {"test_records.json", "test_data.json"} or (name.startswith("test_") and name.endswith(".json"))
    if not (is_test_py or is_records):
        continue
    relative = path.relative_to(source_root)
    if relative.parts[0] in skip_modules or relative.parts[0] in {"tests"} and is_test_py and False:
        skipped += 1
        continue
    target = target_root / relative
    if is_test_py:
        if target.exists():
            skipped += 1
            continue
        pc.port(app, relative.as_posix())
        ported += 1
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
        copied += 1
print("ported", ported, "copied", copied, "skipped", skipped)
