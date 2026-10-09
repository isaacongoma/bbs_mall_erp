from contextlib import contextmanager

from django.db import transaction


@contextmanager
def savepoint(catch: type[Exception] | tuple[type[Exception], ...] = Exception):
    try:
        with transaction.atomic():
            yield
    except catch:
        pass


def get_duckdb(read_only=True, filename=None):
    import os

    import duckdb

    import frappe
    from frappe.database.duckdb.database import DuckDBConnection

    if not filename:
        return

    db_home = os.path.realpath(frappe.utils.get_files_path(is_private=True))
    db_with_abs_path = os.path.join(db_home, filename)
    return DuckDBConnection(duckdb.connect(f"{db_with_abs_path}", read_only=read_only))


def delete_duckdb_file(filename=None):
    import os

    import frappe

    db_home = os.path.realpath(frappe.utils.get_files_path(is_private=True))
    db_with_abs_path = os.path.join(db_home, filename)
    try:
        os.remove(db_with_abs_path)
    except FileNotFoundError:
        return


def get_db(socket=None, host=None, user=None, password=None, port=None, cur_db_name=None):
    import frappe

    return frappe.db
