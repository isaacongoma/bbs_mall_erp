import functools

from django.db import connection

DEFAULTS = {
    "character varying": "''",
    "text": "''",
    "character": "''",
    "smallint": "0",
    "integer": "0",
    "bigint": "0",
    "numeric": "0",
    "double precision": "0",
    "real": "0",
    "boolean": "false",
    "timestamp with time zone": "now()",
    "timestamp without time zone": "now()",
    "date": "current_date",
    "time without time zone": "'00:00:00'",
}


def _columns_missing_defaults(table, model_columns):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_name = %s AND table_schema = current_schema() "
            "AND is_nullable = 'NO' AND column_default IS NULL AND is_identity = 'NO'",
            [table],
        )
        return [(name, kind) for name, kind in cursor.fetchall() if name not in model_columns and kind in DEFAULTS]


class _AppsProxy:
    def __init__(self, apps, applied):
        self._apps = apps
        self._applied = applied

    def __getattr__(self, name):
        return getattr(self._apps, name)

    def get_model(self, *args, **kwargs):
        model = self._apps.get_model(*args, **kwargs)
        table = model._meta.db_table
        if table.startswith("tab") and table not in self._applied:
            model_columns = {field.column for field in model._meta.local_concrete_fields}
            added = []
            with connection.cursor() as cursor:
                for column, kind in _columns_missing_defaults(table, model_columns):
                    cursor.execute(f'ALTER TABLE "{table}" ALTER COLUMN "{column}" SET DEFAULT {DEFAULTS[kind]}')
                    added.append(column)
            self._applied[table] = added
        return model


def tolerant_extra_columns(function):
    @functools.wraps(function)
    def wrapper(apps, schema_editor):
        applied = {}
        try:
            return function(_AppsProxy(apps, applied), schema_editor)
        finally:
            with connection.cursor() as cursor:
                for table, columns in applied.items():
                    for column in columns:
                        cursor.execute(f'ALTER TABLE "{table}" ALTER COLUMN "{column}" DROP DEFAULT')

    return wrapper
