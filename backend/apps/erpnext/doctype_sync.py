from django.utils import timezone

from apps.frappe.models import DocFieldTable, DocTypeTable


def sync_doctype_tables():
    from apps.erpnext.registry import _meta_by_doctype

    now = timezone.now()
    doc_columns = {f.name for f in DocTypeTable._meta.fields}
    field_columns = {f.name for f in DocFieldTable._meta.fields}
    DocFieldTable.objects.all().delete()
    DocTypeTable.objects.all().delete()
    doctypes = []
    fields = []
    for name, meta in _meta_by_doctype().items():
        values = {key: value for key, value in meta.items() if key in doc_columns and not isinstance(value, (list, dict)) and value is not None}
        for key, value in list(values.items()):
            if isinstance(value, bool):
                values[key] = int(value)
        values["name"] = name
        values["creation"] = values["modified"] = now
        doctypes.append(DocTypeTable(**{k: v for k, v in values.items() if k != "idx"} | {"idx": 0}))
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
