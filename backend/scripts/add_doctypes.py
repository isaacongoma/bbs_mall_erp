import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUTO = ROOT / "backend" / "apps" / "erpnext" / "management" / "auto_doctypes.json"


def vendor_doctypes():
    names = set()
    for base in (ROOT / "vendor" / "erpnext" / "erpnext", ROOT / "vendor" / "frappe" / "frappe"):
        for path in base.glob("**/doctype/*/*.json"):
            try:
                meta = json.loads(path.read_text(encoding="utf-8"))
            except ValueError:
                continue
            if isinstance(meta, dict) and meta.get("doctype") == "DocType":
                names.add(meta["name"])
    return names


def main(names):
    known = vendor_doctypes()
    existing = json.loads(AUTO.read_text(encoding="utf-8")) if AUTO.exists() else []
    added = []
    for name in names:
        if name in known and name not in existing:
            existing.append(name)
            added.append(name)
        elif name not in known:
            print("not in vendor:", name)
    AUTO.write_text(json.dumps(existing, indent=1), encoding="utf-8")
    print("added", added)


if __name__ == "__main__":
    main(sys.argv[1:])
