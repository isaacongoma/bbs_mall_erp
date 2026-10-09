from apps.frappe.database.utils import (
    DefaultOrderBy,
    EmptyQueryValues,
    FallBackDateTimeStr,
    FilterValue,
    LazyMogrify,
    Query,
    QueryValues,
    convert_to_value,
    get_doctype_sort_info,
    get_query_type,
    is_query_type,
)
from apps.frappe.runtime import Database
import frappe
import random
import string
from contextlib import contextmanager, suppress


@contextmanager
def savepoint(catch=Exception):
    try:
        savepoint = "".join(random.sample(string.ascii_lowercase, 10))
        frappe.db.savepoint(savepoint)
        yield
    except catch:
        frappe.db.rollback(save_point=savepoint)
    else:
        frappe.db.release_savepoint(savepoint)


def get_query_execution_timeout() -> int:
    from rq import get_current_job

    if not frappe.conf.get("enable_db_statement_timeout"):
        return 0

    timeout = 0
    with suppress(Exception):
        if getattr(frappe.local, "request", None):
            timeout = frappe.conf.get("http_timeout") or 120
        elif job := get_current_job():
            timeout = job.timeout

    return int(timeout * 1.5)
