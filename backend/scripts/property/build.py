import importlib.util
import json
import keyword
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import dsl  # noqa: E402
import defs_leases  # noqa: E402
import defs_masters  # noqa: E402
import defs_operations  # noqa: E402

spec = importlib.util.spec_from_file_location(
    "gen", HERE.parents[1] / "apps" / "erpnext" / "management" / "commands" / "generate_doctypes.py"
)
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)


def all_defs():
    return defs_masters.defs() + defs_leases.defs() + defs_operations.defs()


def write_generated(folder, meta):
    name = meta["name"]
    dt_module = dsl.scrub(name)
    controller = folder / f"{dt_module}.py"
    if not controller.exists():
        controller.write_text(
            "from apps.frappe.model.document import Document\n\n\n"
            f"class {gen.class_name(name)}(Document):\n"
            f"    doctype = {name!r}\n",
            encoding="utf-8",
        )
    if meta.get("issingle"):
        return
    base = "FrappeChildModel" if meta.get("istable") else "FrappeModel"
    lines = [
        "from django.db import models\n\n",
        "from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel\n\n\n",
        f"class {gen.class_name(name)}Generated({base}):\n",
        f"    doctype = {name!r}\n",
    ]
    if meta.get("is_submittable") and not any(f.get("fieldname") == "amended_from" for f in meta["fields"]):
        lines.append('    amended_from = models.CharField(max_length=140, blank=True, default="")\n')
    for field in meta["fields"]:
        rendered = gen.model_field(field)
        if rendered:
            attribute = gen.field_name(field["fieldname"])
            if keyword.iskeyword(attribute):
                lines.append(f"    locals()[{attribute!r}] = {rendered}\n")
            else:
                lines.append(f"    {attribute} = {rendered}\n")
    lines.append("\n    class Meta:\n        abstract = True\n")
    gen.write_text_if_changed(folder / f"{dt_module}_generated.py", "".join(lines))


def write_models():
    classes = gen.generated_classes(dsl.ROOT)
    lines = ["from django.db import models\n\n"]
    for doctype, mod, dt_module, cls, sort_field, sort_order in classes:
        lines.append(f"from apps.bbs_property.{mod}.doctype.{dt_module}.{dt_module}_generated import {cls}Generated\n")
    lines.append("\n")
    for doctype, mod, dt_module, cls, sort_field, sort_order in classes:
        ordering = f"-{sort_field}" if str(sort_order).upper() == "DESC" else sort_field
        lines.append(f"class {cls}({cls}Generated):\n    class Meta:\n")
        lines.append(f"        db_table = {('tab' + doctype)!r}\n        verbose_name = {doctype!r}\n        ordering = [{ordering!r}]\n\n\n")
    gen.write_text_if_changed(dsl.ROOT / "generated_models.py", "".join(lines))


def main():
    definitions = all_defs()
    for meta in definitions:
        folder = dsl.write_doctype(meta)
        write_generated(folder, meta)
    write_models()
    print(f"wrote {len(definitions)} doctypes")


if __name__ == "__main__":
    main()
