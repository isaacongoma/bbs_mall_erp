from django.utils import timezone

from apps.frappe.models import DocFieldTable, DocPerm, DocTypeTable


def sync_doctype_tables():
    from apps.erpnext.registry import _meta_by_doctype

    now = timezone.now()
    doc_columns = {f.name for f in DocTypeTable._meta.fields}
    field_columns = {f.name for f in DocFieldTable._meta.fields}
    custom_names = set(DocTypeTable.objects.filter(custom=1).values_list("name", flat=True))
    DocFieldTable.objects.exclude(parent__in=custom_names).delete()
    DocTypeTable.objects.exclude(name__in=custom_names).delete()
    DocPerm.objects.filter(parenttype="DocType").exclude(parent__in=custom_names).delete()
    perm_columns = {f.name for f in DocPerm._meta.fields}
    doctypes = []
    fields = []
    permissions = []
    for name, meta in _meta_by_doctype().items():
        if name in custom_names:
            continue
        values = {key: value for key, value in meta.items() if key in doc_columns and not isinstance(value, (list, dict)) and value is not None}
        for key, value in list(values.items()):
            if isinstance(value, bool):
                values[key] = int(value)
        values["name"] = name
        values["creation"] = values["modified"] = now
        doctypes.append(DocTypeTable(**{k: v for k, v in values.items() if k != "idx"} | {"idx": 0}))
        for index, perm in enumerate(meta.get("permissions", []), start=1):
            row = {key: (int(value) if isinstance(value, bool) else value) for key, value in perm.items() if key in perm_columns and value is not None and key not in ("name", "parent", "idx", "creation", "modified")}
            row.update(name=f"{name}-perm-{index}", parent=name, parenttype="DocType", parentfield="permissions", idx=index, creation=now, modified=now)
            permissions.append(DocPerm(**row))
        for index, field in enumerate(meta.get("fields", []), start=1):
            row = {}
            for key, value in field.items():
                if key in field_columns and value is not None:
                    row[key] = int(value) if isinstance(value, bool) else (value if not isinstance(value, (list, dict)) else str(value))
            for key in ("length", "columns", "permlevel"):
                if key in row:
                    try:
                        row[key] = int(row[key])
                    except (TypeError, ValueError):
                        row[key] = 0
            if "precision" in row:
                row["precision"] = str(row["precision"])
            row.update(name=f"{name}-{field.get('fieldname')}-{index}", parent=name, idx=index, creation=now, modified=now)
            row.setdefault("fieldname", "")
            fields.append(DocFieldTable(**row))
    DocTypeTable.objects.bulk_create(doctypes, batch_size=500)
    DocFieldTable.objects.bulk_create(fields, batch_size=2000)
    DocPerm.objects.bulk_create(permissions, batch_size=2000)
    from apps.frappe.model.dynamic_doctype import load_all

    load_all()
