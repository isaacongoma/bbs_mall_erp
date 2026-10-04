import datetime
from collections.abc import Iterable
from decimal import Decimal
from pathlib import Path
from uuid import UUID

from apps.frappe.utils.data import format_timedelta


def json_handler(obj):
    if isinstance(obj, (datetime.date, datetime.datetime, datetime.time)):
        return str(obj)
    if isinstance(obj, datetime.timedelta):
        return format_timedelta(obj)
    if hasattr(obj, "__json__"):
        return obj.__json__()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (Path, UUID)):
        return str(obj)
    if isinstance(obj, Iterable) and not isinstance(obj, (str, bytes)):
        return list(obj)
    if type(obj) is type or isinstance(obj, Exception) or callable(obj):
        return repr(obj)
    raise TypeError(f"Object of type {type(obj)} with value of {obj!r} is not JSON serializable")
