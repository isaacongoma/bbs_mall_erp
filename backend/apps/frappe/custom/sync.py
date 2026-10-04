from django.db import connection

from apps.frappe.model.field_types import django_field, has_column

_synced_tokens = {}


def custom_field_rows(doctype):
    from apps.erpnext.registry import get_model_unsynced

    model = get_model_unsynced("Custom Field")
    return list(model.objects.filter(dt=doctype).order_by("idx", "creation"))


def column_exists(table, column):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.columns WHERE table_name = %s AND column_name = %s AND table_schema = current_schema()",
            [table, column],
        )
        return cursor.fetchone() is not None


def sync_model(model, token):
    doctype = getattr(model, "doctype", None)
    if not doctype or doctype == "Custom Field":
        return
    if _synced_tokens.get(doctype) == token:
        return
    rows = [row for row in custom_field_rows(doctype) if has_column({"fieldtype": row.fieldtype, "is_virtual": row.is_virtual})]
    desired = {row.fieldname: row for row in rows}
    added = getattr(model, "_custom_fields", {})

    for name in list(added):
        if name not in desired:
            field = added.pop(name)
            if field in model._meta.local_fields:
                model._meta.local_fields.remove(field)
            if hasattr(model, name):
                delattr(model, name)
            model._meta._expire_cache()

    existing_names = {field.name for field in model._meta.fields}
    for name, row in desired.items():
        if name in existing_names:
            continue
        field = django_field(
            {
                "fieldtype": row.fieldtype,
                "default": row.default,
                "length": row.length,
            }
        )
        model.add_to_class(name, field)
        added[name] = field
        if not column_exists(model._meta.db_table, name):
            with connection.schema_editor() as editor:
                editor.add_field(model, field)
    model._custom_fields = added
    _synced_tokens[doctype] = token


def drop_custom_column(model, name):
    if column_exists(model._meta.db_table, name):
        with connection.cursor() as cursor:
            cursor.execute('ALTER TABLE "%s" DROP COLUMN "%s"' % (model._meta.db_table, name))
