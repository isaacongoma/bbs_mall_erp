from __future__ import annotations

import contextvars
import functools
import itertools
import importlib
import inspect
import json
import secrets

import re
import sys
from collections.abc import Callable, Iterable, Sequence
from typing import Any

import contextlib

from django.db import DatabaseError, connection, transaction
FilterValue = str | int | bool
loggers = {}
log_level = None
DefaultOrderBy = "KEEP_DEFAULT_ORDERING"
from django.db import DataError as DjangoDataError
from django.db import InterfaceError as DjangoInterfaceError
from django.db import InternalError as DjangoInternalError
from django.db import OperationalError as DjangoOperationalError
from django.db import ProgrammingError as DjangoProgrammingError

_BARE_TABLE_NAME = re.compile(r"\b((?i:from|join|into|update|table))(\s+)(tab[A-Z][A-Za-z0-9_]*)\b(?!\")")

class _dict(dict):
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

    def as_dict(self, *args, **kwargs):
        return _dict(self)

    def update(self, *args, **kwargs):
        super().update(*args, **kwargs)
        return self

    def copy(self):
        return _dict(self)


_local = contextvars.ContextVar("frappe_local", default=None)


def _state():
    value = _local.get()
    if not isinstance(value, _dict):
        value = _dict(value or {})
        _local.set(value)
    value.setdefault("session", _dict(user="Administrator"))
    value.setdefault("flags", _dict(currently_saving=[]))
    value.setdefault("conf", _dict(db_type="postgres"))
    value.setdefault("lang", "en")
    if "response_headers" not in value:
        from werkzeug.datastructures import Headers

        value["response_headers"] = Headers()
    value.setdefault("site", "default")
    value.setdefault("site", None)
    value.setdefault("role_permissions", {})
    value.setdefault("error_log", [])
    value.setdefault("debug_log", [])
    value.setdefault("locked_documents", [])
    value.setdefault("test_objects", __import__("collections").defaultdict(list))
    value.setdefault("site_name", "default")
    value.setdefault("all_apps", None)
    value.setdefault("request_ip", None)
    value.setdefault("task_id", None)
    value.setdefault("valid_columns", {})
    value.setdefault("new_doc_templates", {})
    value.setdefault("jenv_restricted", None)
    value.setdefault("jenv_unrestricted", None)
    value.setdefault("jloader", None)
    value.setdefault("cache", {})
    value.setdefault("preload_assets", {"style": [], "script": [], "icons": []})
    value.setdefault("request", None)
    value.setdefault("form_dict", _dict())
    value.setdefault("response", _dict(docs=[]))
    value.setdefault("message_log", [])
    value.setdefault("request_cache", __import__("collections").defaultdict(dict))
    value.setdefault("new_doc_templates", {})
    value.setdefault("future_sle", {})
    return value


def _read_modules(app):
    import os

    from django.conf import settings

    path = os.path.join(settings.BASE_DIR, "apps", app, "modules.txt")
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


class _LocalProxy:
    def __getattr__(self, key):
        if key == "db":
            return db
        if key == "app_modules":
            return {app: _read_modules(app) for app in ("frappe", "erpnext", "hrms")}
        if key == "module_app":
            return {scrub(module): app for app in ("frappe", "erpnext", "hrms") for module in _read_modules(app)}
        if key == "qb":
            from apps.frappe.query_builder import builder as _builder

            return _builder.Postgres
        if key in ("site_path", "sites_path"):
            import os

            from django.conf import settings

            sites = os.path.join(str(settings.BASE_DIR), "sites")
            path = sites if key == "sites_path" else os.path.join(sites, "default")
            os.makedirs(path, exist_ok=True)
            for sub in ("locks", "logs", os.path.join("private", "files"), os.path.join("public", "files")):
                os.makedirs(os.path.join(path, sub), exist_ok=True)
            apps_file = os.path.join(sites, "apps.txt")
            if not os.path.exists(apps_file):
                with open(apps_file, "w") as handle:
                    handle.write("\n".join(("frappe", "erpnext", "hrms")) + "\n")
            return path
        state = _state()
        if key not in state:
            raise AttributeError(key)
        return state[key]

    def __setattr__(self, key, value):
        setattr(_state(), key, value)


class _SessionProxy:
    @property
    def data(self):
        session = _state().session
        data = getattr(session, "data", None)
        if data is None:
            data = _dict()
            try:
                session.data = data
            except AttributeError:
                pass
        return data

    def __getattr__(self, key):
        return getattr(_state().session, key)

    def __getitem__(self, key):
        return _state().session[key]

    def __setitem__(self, key, value):
        _state().session[key] = value

    def get(self, key, default=None):
        return _state().session.get(key, default)

    def __contains__(self, key):
        return key in _state().session

    def __setattr__(self, key, value):
        setattr(_state().session, key, value)


class _FlagsProxy:
    def __getattr__(self, key):
        return getattr(_state().flags, key)

    def __setattr__(self, key, value):
        setattr(_state().flags, key, value)

    def __getitem__(self, key):
        return _state().flags[key]

    def __setitem__(self, key, value):
        _state().flags[key] = value

    def __delitem__(self, key):
        del _state().flags[key]

    def __contains__(self, key):
        return key in _state().flags

    def get(self, key, default=None):
        return _state().flags.get(key, default)

    def pop(self, key, *default):
        return _state().flags.pop(key, *default)

    def setdefault(self, key, default=None):
        return _state().flags.setdefault(key, default)

    def update(self, *args, **kwargs):
        _state().flags.update(*args, **kwargs)

    def items(self):
        return _state().flags.items()

    def keys(self):
        return _state().flags.keys()


local = _LocalProxy()
session = _SessionProxy()
flags = _FlagsProxy()


def _(message, *args, **kwargs):
    kwargs.pop("context", None)
    kwargs.pop("lang", None)
    if args or kwargs:
        return message.format(*args, **kwargs)
    return message


_lt = _
N_ = _


def throw(
    msg=None,
    exc=None,
    title=None,
    is_minimizable=False,
    wide=False,
    as_list=False,
    primary_action=None,
    *,
    allow_dangerous_html=False,
    message=None,
    **kwargs,
):
    if msg is None:
        msg = message
    if exc is None:
        from apps.frappe.exceptions import ValidationError

        exc = ValidationError
    if isinstance(msg, (list, tuple)):
        msg = "<br>".join(str(part) for part in msg)
    raise exc(msg)


def get_request_header(key, default=None):
    request = getattr(local, "request", None)
    if request is None:
        return default
    headers = getattr(request, "headers", None) or getattr(request, "META", None)
    if headers is None:
        return default
    if hasattr(headers, "get"):
        return headers.get(key, default)
    return default


class _ConfProxy:
    def _conf(self):
        conf = _state().conf
        if conf is None:
            conf = _dict()
            _state().conf = conf
        return conf

    def get(self, key, default=None):
        return self._conf().get(key, default)

    def __getitem__(self, key):
        return self._conf()[key]

    def __setitem__(self, key, value):
        self._conf()[key] = value

    def __contains__(self, key):
        return key in self._conf()

    def __iter__(self):
        return iter(self._conf())

    def items(self):
        return self._conf().items()

    def keys(self):
        return self._conf().keys()

    def update(self, *args, **kwargs):
        self._conf().update(*args, **kwargs)

    def setdefault(self, key, default=None):
        return self._conf().setdefault(key, default)

    def pop(self, key, *default):
        return self._conf().pop(key, *default)

    def __getattr__(self, key):
        conf = _state().conf
        if conf is None:
            return None
        return conf.get(key)

    def __setattr__(self, key, value):
        conf = _state().conf
        if conf is None:
            conf = _dict()
            _state().conf = conf
        conf[key] = value


conf = _ConfProxy()


def msgprint(
    msg=None,
    title=None,
    raise_exception=False,
    as_table=False,
    as_list=False,
    indicator=None,
    alert=False,
    primary_action=None,
    is_minimizable=False,
    wide=False,
    *,
    realtime=False,
    message=None,
    **kwargs,
):
    if msg is None:
        msg = message
    message = msg
    log = getattr(local, "message_log", None)
    if log is None:
        local.message_log = []
        log = local.message_log
    log.append({"message": message, "raise_exception": raise_exception})
    if raise_exception:
        from apps.frappe.exceptions import ValidationError

        exc = raise_exception if isinstance(raise_exception, type) else ValidationError
        throw(message, exc=exc)
    return message


def clear_last_message():
    log = getattr(local, "message_log", None) or []
    if log:
        log.pop()


class _InTest:
    def __bool__(self):
        import sys

        return "test" in sys.argv


in_test = _InTest()


class _FormDictProxy:
    def _mapping(self):
        state = _state()
        if not isinstance(state.get("form_dict"), _dict):
            state.form_dict = _dict()
        return state.form_dict

    def get(self, key, default=None):
        return self._mapping().get(key, default)

    def __getitem__(self, key):
        return self._mapping()[key]

    def __setitem__(self, key, value):
        self._mapping()[key] = value

    def __delitem__(self, key):
        del self._mapping()[key]

    def __contains__(self, key):
        return key in self._mapping()

    def __iter__(self):
        return iter(self._mapping())

    def __len__(self):
        return len(self._mapping())

    def __getattr__(self, key):
        if key.startswith("_"):
            raise AttributeError(key)
        return self._mapping().get(key)

    def __setattr__(self, key, value):
        self._mapping()[key] = value

    def __delattr__(self, key):
        self._mapping().pop(key, None)

    def __repr__(self):
        return repr(self._mapping())

    def setdefault(self, key, default=None):
        return self._mapping().setdefault(key, default)

    def keys(self):
        return self._mapping().keys()

    def values(self):
        return self._mapping().values()

    def items(self):
        return self._mapping().items()

    def update(self, *args, **kwargs):
        self._mapping().update(*args, **kwargs)

    def pop(self, key, *default):
        return self._mapping().pop(key, *default)

    def clear(self):
        self._mapping().clear()

    def copy(self):
        return _dict(self._mapping())


form_dict = _FormDictProxy()


def clear_cache(doctype=None, user=None, **kwargs):
    return None


def render_template(template, context=None, is_path=None, safe_render=True, **kwargs):
    from apps.frappe.utils.jinja import render_template as render

    return render(template, context, is_path, safe_render, **kwargs)


def publish_realtime(*args, **kwargs):
    return None


def enqueue(method, queue="default", timeout=None, event=None, is_async=True, job_name=None, now=False, enqueue_after_commit=False, **kwargs):
    from apps.frappe.utils.background_jobs import enqueue as _enqueue

    return _enqueue(method, queue, timeout, event, is_async, job_name, now, enqueue_after_commit, **kwargs)


def has_permission(doctype=None, ptype="read", doc=None, user=None, parent_doctype=None, throw=False, **kwargs):
    from apps.frappe.permissions import has_permission as _has_permission
    from apps.frappe.permissions import raise_permission_error

    if not doctype and doc is not None and not isinstance(doc, (str, int)):
        doctype = doc.doctype
    if isinstance(doc, (str, int)):
        doc = get_doc(doctype, doc, ignore_permissions=True)
    allowed = _has_permission(parent_doctype or doctype, ptype, doc=doc, user=user)
    if not allowed and throw:
        raise_permission_error(doctype, ptype)
    return allowed


def delete_doc_if_exists(doctype, name, force=0):
    if db.exists(doctype, name):
        delete_doc(doctype, name, force=force)


def delete_doc(*args, **kwargs):
    from apps.frappe.model.delete_doc import delete_doc as _delete_doc

    return _delete_doc(*args, **kwargs)


def rename_doc(*args, **kwargs):
    from apps.frappe.model.rename_doc import rename_doc as _rename_doc

    return _rename_doc(*args, **kwargs)


def parse_json(value):
    if isinstance(value, str):
        value = json.loads(value)
    if isinstance(value, dict) and not isinstance(value, _dict):
        value = _dict(value)
    return value


def as_json(obj, indent=1, separators=None, ensure_ascii=True):
    from apps.frappe.utils.response import json_handler

    if separators is None:
        separators = (",", ": ")
    try:
        return json.dumps(
            obj, indent=indent, sort_keys=True, default=json_handler, separators=separators, ensure_ascii=ensure_ascii
        )
    except TypeError:
        return json.dumps(obj, indent=indent, default=json_handler, separators=separators, ensure_ascii=ensure_ascii)


def generate_hash(txt=None, length=56):
    import math
    import secrets

    return secrets.token_hex(math.ceil(length / 2))[:length]


def scrub(value):
    return str(value or "").replace(" ", "_").replace("-", "_").lower()


def unscrub(txt):
    return str(txt or "").replace("_", " ").replace("-", " ").title()


def bold(value):
    return f"<b>{value}</b>"


whitelisted = set()
guest_methods = set()
allowed_http_methods_for_whitelisted_func = {}



xss_safe_methods = set()


def _in_request_or_test():
    """
    Internal

    Used by whitelist to determine whether type hints should be validated or not
    """

    return getattr(local, "request", None) or in_test


def whitelist(allow_guest=False, xss_safe=False, methods=None, force_types=None):
    """
    Decorator for whitelisting a function and making it accessible via HTTP.
    Standard request will be `/api/method/[path.to.method]`

    :param allow_guest: Allow non logged-in user to access this method.
    :param methods: Allowed http method to access the method.
    :param force_types: Method should have type annotations. If unset, defaults to hooks
                        specification.

    Use as:

            @frappe.whitelist()
            def myfunc(param1, param2):
                    pass
    """

    if not methods:
        methods = ("GET", "POST", "PUT", "DELETE", "QUERY")
    elif isinstance(methods, str):
        methods = (methods,)
    else:
        methods = tuple(methods)

    if "GET" in methods and "QUERY" not in methods:
        methods = (*methods, "QUERY")

    def innerfn(fn):
        from frappe.utils.typing_validations import validate_argument_types

        global whitelisted, guest_methods, xss_safe_methods, allowed_http_methods_for_whitelisted_func

        fn = validate_argument_types(fn, apply_condition=_in_request_or_test, force_types=force_types)

        whitelisted.add(fn)
        allowed_http_methods_for_whitelisted_func[fn] = methods

        if allow_guest:
            guest_methods.add(fn)

            if xss_safe:
                xss_safe_methods.add(fn)

        return fn

    return innerfn


def is_whitelisted(method):
    from apps.frappe.exceptions import AppDisabledError, PermissionError, SessionExpired
    from frappe.utils import sanitize_html_payload

    response = local.response

    app_name = (method.__module__ or "").split(".", 1)[0]
    from frappe.apps import get_disabled_apps

    if app_name in get_disabled_apps():
        throw(_("App {0} is disabled on this site").format(app_name), AppDisabledError)

    is_guest = session["user"] == "Guest"
    if method not in whitelisted or (is_guest and method not in guest_methods):
        if method in whitelisted and is_guest and response.get("session_expired"):
            raise SessionExpired

        summary = _("You are not permitted to access this resource. Login to access")
        detail = _("Function {0} is not whitelisted.").format(bold(f"{method.__module__}.{method.__name__}"))
        msg = f"<details><summary>{summary}</summary>{detail}</details>"
        throw(msg, PermissionError, title=_("Method Not Allowed"))

    if is_guest and method not in xss_safe_methods:
        for key, value in form_dict.items():
            if isinstance(value, str):
                form_dict[key] = sanitize_html_payload(value)






def validate_and_sanitize_search_inputs(fn):
    import functools

    from apps.frappe.utils import cint

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        kwargs.update(dict(zip(fn.__code__.co_varnames, args, strict=False)))
        if "start" in kwargs:
            kwargs["start"] = cint(kwargs["start"])
        if "page_len" in kwargs:
            kwargs["page_len"] = cint(kwargs["page_len"])
        return fn(**kwargs)

    return wrapper


def get_attr(path):
    if callable(path):
        return path
    module_name, attr_name = path.rsplit(".", 1)
    return getattr(importlib.import_module(path.rsplit(".", 1)[0]), attr_name)


def get_module(path):
    return importlib.import_module(path)


HOOK_APPS = ("apps.frappe.hooks", "apps.erpnext.hooks", "apps.hrms.hooks", "apps.erpnext.regional.kenya.hooks", "apps.erpnext.erpnext_integrations.hooks")
DOCTYPE_HOOK_LISTS = {
    "advance_payment_payable_doctypes",
    "invoice_doctypes",
    "period_closing_doctypes",
    "accounting_dimension_doctypes",
    "bank_reconciliation_doctypes",
    "audit_trail_doctypes",
    "company_data_to_be_ignored",
    "ignore_links_on_delete",
    "repost_allowed_doctypes",
}
SKIPPED_UNREGISTERED_HOOK_DOCTYPES = set()


def _append_hook(target, key, value):
    if isinstance(value, dict):
        target.setdefault(key, _dict())
        for inkey in value:
            _append_hook(target[key], inkey, value[inkey])
    else:
        target.setdefault(key, [])
        if not isinstance(value, list):
            value = [value]
        target[key].extend(value)


_hooks_cache = {}


def _registered_hook_doctypes():
    doctypes = set()
    try:
        from apps.erpnext.registry import list_doctypes

        doctypes.update(list_doctypes())
    except Exception:
        pass
    try:
        from django.apps import apps

        for model in apps.get_models():
            doctype = getattr(model, "doctype", None) or str(model._meta.verbose_name)
            if doctype:
                doctypes.add(doctype)
    except Exception:
        pass
    return doctypes


def _filter_unregistered_hook_doctypes(merged):
    registered = _registered_hook_doctypes()
    if not registered:
        return merged
    for key in DOCTYPE_HOOK_LISTS:
        values = merged.get(key)
        if not isinstance(values, list):
            continue
        kept = []
        for value in values:
            if value in registered:
                kept.append(value)
            else:
                SKIPPED_UNREGISTERED_HOOK_DOCTYPES.add((key, value))
        merged[key] = kept
    doc_events = merged.get("doc_events")
    if isinstance(doc_events, dict):
        for key in list(doc_events):
            doctypes = key if isinstance(key, tuple) else (key,)
            kept = tuple(doctype for doctype in doctypes if doctype in registered or doctype == "*")
            for doctype in doctypes:
                if doctype not in registered and doctype != "*":
                    SKIPPED_UNREGISTERED_HOOK_DOCTYPES.add(("doc_events", doctype))
            if not kept:
                doc_events.pop(key, None)
            elif kept != doctypes:
                value = doc_events.pop(key)
                doc_events[kept if isinstance(key, tuple) else kept[0]] = value
    overrides = merged.get("override_doctype_class")
    if isinstance(overrides, dict):
        for doctype in list(overrides):
            if doctype not in registered:
                SKIPPED_UNREGISTERED_HOOK_DOCTYPES.add(("override_doctype_class", doctype))
                overrides.pop(doctype, None)
    global_search = merged.get("global_search_doctypes")
    if isinstance(global_search, dict):
        for group, entries in list(global_search.items()):
            kept = []
            for entry in entries if isinstance(entries, list) else []:
                doctype = entry.get("doctype") if isinstance(entry, dict) else None
                if doctype in registered:
                    kept.append(entry)
                elif doctype:
                    SKIPPED_UNREGISTERED_HOOK_DOCTYPES.add(("global_search_doctypes", doctype))
            global_search[group] = kept
    return merged


def _load_hooks():
    if "all" not in _hooks_cache:
        merged = _dict()
        for module_path in HOOK_APPS:
            module = importlib.import_module(module_path)
            for key in dir(module):
                if key.startswith("_"):
                    continue
                _append_hook(merged, key, getattr(module, key))
        _hooks_cache["all"] = _filter_unregistered_hook_doctypes(merged)
    return _hooks_cache["all"]


def _load_app_hooks(app_name):
    cache_key = f"app:{app_name}"
    if cache_key not in _hooks_cache:
        merged = _dict()
        for module_path in HOOK_APPS:
            if module_path.split(".")[1] != app_name:
                continue
            module = importlib.import_module(module_path)
            for key in dir(module):
                if key.startswith("_"):
                    continue
                _append_hook(merged, key, getattr(module, key))
        _hooks_cache[cache_key] = _filter_unregistered_hook_doctypes(merged)
    return _hooks_cache[cache_key]


def get_hooks(hook=None, default=None, app_name=None):
    hooks = _load_app_hooks(app_name) if app_name else _load_hooks()
    if hook:
        value = hooks.get(hook)
        if value is None or value == []:
            return default if default is not None else []
        return value
    return hooks


def get_doc_hooks():
    if "doc_hooks" not in _hooks_cache:
        out = _dict()
        doc_events = get_hooks("doc_events", {})
        for key, event_map in doc_events.items():
            doctypes = key if isinstance(key, tuple) else (key,)
            for doctype in doctypes:
                _append_hook(out, doctype, event_map)
        _hooks_cache["doc_hooks"] = out
    return _hooks_cache["doc_hooks"]


UNRESOLVED_HOOK_HANDLERS = set()


def resolve_hook_handler(path):
    try:
        return get_attr(path)
    except (ModuleNotFoundError, AttributeError) as exc:
        if isinstance(exc, ModuleNotFoundError) and exc.name and not exc.name.startswith(("frappe", "erpnext", "hrms", "apps")):
            raise
        UNRESOLVED_HOOK_HANDLERS.add(path)
        return None


SYSTEM_SETTINGS_OVERRIDE = {}


def _stored_system_settings():
    cached = getattr(local, "_stored_system_settings", None)
    if cached is not None:
        return cached
    values = {}
    try:
        meta = get_meta("System Settings")
        for df in meta.fields:
            default = df.get("default")
            if df.get("fieldname") and default not in (None, ""):
                values[df.fieldname] = int(default) if str(default).lstrip("-").isdigit() and df.get("fieldtype") in ("Check", "Int") else default
        values.update({k: v for k, v in (db.get_singles_dict("System Settings", cast=True) or {}).items() if v not in (None, "")})
    except Exception:
        values = {}
    local._stored_system_settings = values
    return values


def get_system_settings(key=None):
    defaults = {
        "rounding_method": "Banker's Rounding",
    }
    defaults.update(_stored_system_settings())
    defaults.update(getattr(local, "system_settings", None) or {})
    defaults.update(SYSTEM_SETTINGS_OVERRIDE)
    if key:
        return defaults.get(key)
    return _dict(defaults)


def _row_matches(row, filters):
    if isinstance(filters, dict):
        items = filters.items()
    else:
        items = [(f[0], f[1:]) for f in filters]
    for key, expected in items:
        actual = row.get(key)
        if isinstance(expected, (list, tuple)) and len(expected) == 2 and isinstance(expected[0], str):
            operator, operand = expected
            operator = operator.lower()
            if operator == "in" and actual not in operand:
                return False
            if operator == "not in" and actual in operand:
                return False
            if operator in ("=", "==") and actual != operand:
                return False
            if operator in ("!=", "<>") and actual == operand:
                return False
        elif isinstance(expected, (list, tuple)):
            if actual not in expected:
                return False
        elif actual != expected:
            return False
    return True


@functools.lru_cache(maxsize=1)
def _doctype_check_fields():
    from django.db import models

    from apps.frappe.models import DocTypeTable

    return frozenset(
        field.name for field in DocTypeTable._meta.fields if isinstance(field, models.SmallIntegerField)
    )


def _trigram_schema():
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm'"
        )
        row = cursor.fetchone()
        if row:
            return row[0]
        cursor.execute("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm'")
        if not cursor.fetchone():
            return None
        try:
            with transaction.atomic():
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        except DatabaseError:
            return None
        cursor.execute(
            "SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pg_trgm'"
        )
        return cursor.fetchone()[0]


class Meta(_dict):
    def set(self, key, value):
        dict.__setitem__(self, key, value)
        return self

    def __getattr__(self, key):
        if key in ("fields", "permissions", "actions", "links", "states"):
            return self.get(key) or []
        value = dict.get(self, key)
        if value is None and key in _doctype_check_fields():
            return 0
        return value

    def get(self, key, default=None, limit=None):
        filters = default if isinstance(default, (dict, list, tuple)) and key in ("fields", "permissions", "actions", "links", "states") else None
        value = dict.get(self, key, None if filters is not None else default)
        if key in ("fields", "permissions", "actions", "links", "states") and isinstance(value, list):
            rows = [_dict(item) if isinstance(item, dict) and not isinstance(item, _dict) else item for item in value]
            for row in rows:
                if isinstance(row, _dict):
                    row.setdefault("parent", dict.get(self, "name"))
                    row.setdefault("parenttype", "DocType")
                    row.setdefault("parentfield", key)
            if filters:
                rows = [row for row in rows if _row_matches(row, filters)]
            if limit:
                rows = rows[:limit]
            return rows
        if value is None and filters is not None:
            return []
        return value


    def get_field(self, fieldname):
        for field in self.get("fields") or []:
            if field.get("fieldname") == fieldname:
                return _dict(field)
        return None

    def get_table_fields(self, include_computed=False):
        return [
            _dict(field)
            for field in (self.get("fields") or [])
            if field.get("fieldtype") in {"Table", "Table MultiSelect"}
        ]

    def get_valid_columns(self):
        from apps.frappe.model import data_fieldtypes, default_fields

        columns = list(default_fields)
        if self.get("istable"):
            columns += ["parent", "parentfield", "parenttype"]
        if self.is_nested_set():
            columns += ["lft", "rgt", "old_parent"]
        columns += [
            f["fieldname"]
            for f in (self.get("fields") or [])
            if f.get("fieldtype") in data_fieldtypes and f.get("fieldname")
        ]
        return list(dict.fromkeys(columns))

    @property
    def _valid_columns(self):
        return self.get_valid_columns()

    @property
    def _table_doctypes(self):
        return {f["fieldname"]: f["options"] for f in self.fields if f.get("fieldtype") in ("Table", "Table MultiSelect") and f.get("options")}

    @property
    def _non_computed_table_doctypes(self):
        return {
            f["fieldname"]: f["options"]
            for f in self.fields
            if f.get("fieldtype") in ("Table", "Table MultiSelect") and f.get("options") and not f.get("is_virtual")
        }

    def get_fields_to_fetch(self, link_fieldname=None):
        fields = [f for f in self.fields if f.get("fetch_from") and "." in f.get("fetch_from")]
        if link_fieldname:
            fields = [f for f in fields if f["fetch_from"].split(".", 1)[0] == link_fieldname]
        return fields

    def get_workflow(self):
        return None


    def get_link_doctype(self, fieldname):
        field = self.get_field(fieldname)
        if not field:
            return None
        if field.get("fieldtype") == "Link":
            return field.get("options")
        return None

    def as_dict(self, no_nulls=False):
        return dict(self)

    def is_nested_set(self):
        return bool(self.get("is_tree")) or bool(self.get("nsm_parent_field"))

    def get_naming_series_options(self):
        field = self.get_field("naming_series")
        options = (field.get("options") if field else "") or ""
        return [option.strip() for option in options.splitlines()]

    def get_link_fields(self):
        return [f for f in self.fields if f.get("fieldtype") == "Link" and f.get("options")]

    def get_dynamic_link_fields(self):
        return [f for f in self.fields if f.get("fieldtype") == "Dynamic Link"]

    def get_select_fields(self):
        return [f for f in self.fields if f.get("fieldtype") == "Select" and f.get("options")]

    def get_image_fields(self):
        return [f for f in self.fields if f.get("fieldtype") == "Attach Image"]

    def get_data_fields(self):
        return [f for f in self.fields if f.get("fieldtype") == "Data"]







    def get_valid_columns(self):
        columns = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"]
        if self.get("istable"):
            columns += ["parent", "parenttype", "parentfield"]
        if self.get("is_tree"):
            columns += ["lft", "rgt", "old_parent"]
        return columns + [f for f in self.get_fieldnames_with_value() if not self.get_field(f).get("is_virtual")]


    @property
    def fields(self):
        return [_dict(field) for field in (self.get("fields") or [])]
























def get_meta(doctype, cached=True, **kwargs):
    import importlib

    importlib.import_module("apps.frappe.model.meta")
    from apps.erpnext.registry import get_meta as _get_meta
    from apps.frappe.exceptions import DoesNotExistError

    try:
        data = _get_meta(doctype)
    except KeyError as exc:
        raise DoesNotExistError(doctype) from exc
    return Meta(data)


_NUMERIC_ZERO = {"Check": 0, "Int": 0, "Long Int": 0, "Float": 0.0, "Currency": 0.0, "Percent": 0.0, "Duration": 0.0}


def _zero_fill(doctype, data):
    from apps.erpnext.registry import get_meta as _registry_meta

    try:
        fields = _registry_meta(doctype).get("fields", [])
    except KeyError:
        return data
    for df in fields:
        zero = _NUMERIC_ZERO.get(df.get("fieldtype"))
        fieldname = df.get("fieldname")
        if zero is not None and fieldname in data and data[fieldname] is None:
            data[fieldname] = zero
    return data


def _loaded_value(value):
    import decimal

    if hasattr(value, "email") and hasattr(value, "_meta") and getattr(value._meta, "model_name", "") == "user":
        return value.email
    if isinstance(value, decimal.Decimal):
        return float(value)
    import datetime

    if isinstance(value, datetime.datetime) and value.tzinfo is not None:
        from django.utils import timezone

        return timezone.make_naive(value, timezone.get_default_timezone())
    return value


def new_doc(doctype, *, parent_doc=None, parentfield=None, as_dict=False, **kwargs):
    from apps.frappe.model.create_new import get_new_doc

    doc = get_new_doc(doctype, parent_doc=parent_doc, parentfield=parentfield, as_dict=as_dict)
    if parent_doc is not None and not as_dict:
        doc.idx = len(parent_doc.get(parentfield) or []) + 1
    if kwargs:
        doc.update(kwargs)
    return doc


def get_doc(*args, **kwargs):
    control = {key: kwargs.pop(key) for key in ("ignore_permissions", "for_update", "check_permission") if key in kwargs}
    if args and not isinstance(args[0], (dict, str)):
        from apps.frappe.model.document import Document

        if isinstance(args[0], Document):
            return args[0]
    if not args and kwargs:
        return _get_doc(dict(kwargs), **control)
    if args and isinstance(args[0], dict):
        data = dict(args[0])
        data.update(kwargs)
        return _get_doc(data, **control)
    if len(args) >= 2 or (args and not kwargs):
        return _get_doc(*args, **control)
    if args:
        return _get_doc(args[0], **control)
    raise TypeError("get_doc requires a doctype or a dict")


def _case_insensitive_match(model, name):
    if not isinstance(name, str) or not any(field.name == "name" for field in model._meta.fields):
        return None
    matches = list(model.objects.filter(name__iexact=name)[:2])
    return matches[0] if len(matches) == 1 else None


def _get_doc(doctype, name=None, ignore_permissions=False, for_update=False, check_permission=None, **kwargs):
    from apps.erpnext.registry import get_controller, get_meta, get_model
    from apps.frappe.model.document import Document

    if isinstance(doctype, dict):
        try:
            controller = get_controller(doctype.get("doctype"))
        except (KeyError, AttributeError):
            controller = Document
        return controller(doctype)
    if doctype == "DocType" and name:
        from apps.frappe.core.doctype.doctype.doctype import DocType

        return DocType.from_meta(name)
    if get_meta(doctype).get("issingle"):
        data = db.get_singles_dict(doctype)
        data["doctype"] = doctype
        data["name"] = doctype
        for field in get_meta(doctype).get("fields", []):
            if field.get("fieldtype") in {"Table", "Table MultiSelect"} and field.get("options"):
                try:
                    child_model = get_model(field["options"])
                except LookupError:
                    continue
                rows = []
                children = child_model.objects.filter(
                    parent=doctype, parentfield=field["fieldname"], parenttype=doctype
                ).order_by("idx")
                for child in children:
                    child_data = {child_field.name: _loaded_value(getattr(child, child_field.name)) for child_field in child._meta.fields}
                    _zero_fill(field["options"], child_data)
                    child_data["doctype"] = field["options"]
                    rows.append(get_doc(child_data, ignore_permissions=True))
                data[field["fieldname"]] = rows
        try:
            controller = get_controller(doctype)
        except (KeyError, AttributeError):
            controller = Document
        single = controller(data)
        if check_permission:
            single.check_permission("read")
        return single
    model = get_model(doctype)
    from apps.frappe.exceptions import DoesNotExistError

    if isinstance(name, dict):
        match = apply_filters(model.objects.all(), name).first()
        if match is None:
            raise DoesNotExistError(f"{doctype} {name} not found", doctype=doctype)
        name = getattr(match, "name", None) or match.pk
    try:
        from apps.frappe.model.utils.model_names import name_filter

        queryset = model.objects.select_for_update() if for_update else model.objects
        obj = queryset.get(**name_filter(model, name))
    except (model.DoesNotExist, ValueError):
        obj = _case_insensitive_match(model, name)
        if obj is None:
            raise DoesNotExistError(f"{doctype} {name} not found", doctype=doctype) from None
    data = {field.name: _loaded_value(getattr(obj, field.name)) for field in obj._meta.fields}
    _zero_fill(doctype, data)
    data["doctype"] = doctype
    for field in get_meta(doctype).get("fields", []):
        if field.get("fieldtype") not in {"Table", "Table MultiSelect"} or not field.get("options"):
            continue
        try:
            child_model = get_model(field["options"])
        except LookupError:
            continue
        child_field_names = {f.name for f in child_model._meta.fields}
        if not {"parent", "parentfield", "parenttype"}.issubset(child_field_names):
            continue
        rows = []
        for child in child_model.objects.filter(parent=name, parentfield=field["fieldname"], parenttype=doctype).order_by("idx"):
            child_data = {child_field.name: _loaded_value(getattr(child, child_field.name)) for child_field in child._meta.fields}
            _zero_fill(field["options"], child_data)
            child_data["doctype"] = field["options"]
            rows.append(get_doc(child_data, ignore_permissions=True))
        data[field["fieldname"]] = rows
    try:
        controller = get_controller(doctype)
    except (KeyError, AttributeError):
        controller = Document
    doc = controller(data)
    if check_permission:
        doc.check_permission("read")
    return doc


def get_module_path(module, *joins):
    import os

    from django.conf import settings

    scrubbed = scrub(module)
    for app in ("erpnext", "hrms", "frappe"):
        if scrubbed in {scrub(name) for name in _read_modules(app)}:
            return os.path.join(settings.BASE_DIR, "apps", app, scrubbed, *joins)
    return os.path.join(settings.BASE_DIR, "apps", "erpnext", scrubbed, *joins)


def safe_decode(param, encoding="utf-8"):
    try:
        param = param.decode(encoding)
    except Exception:
        pass
    return param


def safe_encode(param, encoding="utf-8"):
    try:
        param = param.encode(encoding)
    except Exception:
        pass
    return param


def get_traceback(with_context=False):
    import traceback

    return traceback.format_exc()


def errprint(msg):
    import sys

    print(msg, file=sys.stderr)


def log_error(title=None, message=None, reference_doctype=None, reference_name=None, defer_insert=False):
    import logging

    from apps.frappe.utils.error import log_error as _log_error

    logging.getLogger("frappe").error("%s: %s", title or "Error", message or get_traceback())
    return _log_error(title, message, reference_doctype, reference_name, defer_insert=defer_insert)


def logger(module=None, with_more_info=False, allow_site=True, filter=None, max_size=100_000, file_count=20):
    import logging

    return logging.getLogger(module or "frappe")


def only_for(roles, message=False):
    from apps.frappe.exceptions import PermissionError

    if session.user == "Administrator":
        return
    if isinstance(roles, str):
        roles = (roles,)
    if not set(roles) & set(get_roles()):
        if message:
            msgprint(_("This action is only allowed for {}").format(bold(", ".join(roles))), raise_exception=True)
        raise PermissionError


def set_user(username):
    session.user = username
    local.user_perms = None


def init(site, sites_path=".", new_site=False, force=False, *, is_request=False, is_job=False):
    state = _state()
    state.site = site or "default"
    state.initialised = True
    if not hasattr(state, "debug_log"):
        state.debug_log = []


def connect(site=None, db_name=None, set_admin_as_user=True):
    if site:
        init(site)
    if set_admin_as_user:
        set_user("Administrator")


def destroy():
    state = _state()
    for key in ("user_perms", "role_permissions", "message_log", "debug_log"):
        if key in state:
            del state[key]


class init_site:
    def __init__(self, site=None):
        self.site = site or ""

    def __enter__(self):
        init(self.site)
        return local

    def __exit__(self, type, value, traceback):
        destroy()


def get_user():
    from apps.frappe.utils.user import UserPermissions

    if not getattr(local, "user_perms", None):
        local.user_perms = UserPermissions(session.user)
    return local.user_perms


def get_precision(doctype, fieldname, currency=None, doc=None):
    from apps.frappe.model.document import get_field_precision

    meta = get_meta(doctype)
    field = meta.get_field(fieldname)
    if not field:
        return None
    return get_field_precision(field, doc, currency)


def reload_doc(module, dt=None, dn=None, force=False, reset_permissions=False):
    return None


def reload_doctype(doctype, force=False, reset_permissions=False):
    return None


def get_value(doctype, filters=None, fieldname="name", ignore=None, as_dict=False, debug=False, order_by="KEEP_DEFAULT_ORDERING", cache=False):
    return db.get_value(doctype, filters, fieldname, ignore, as_dict, debug, order_by, cache=cache)


def set_value(doctype, docname, fieldname, value=None):
    from apps.frappe.client import set_value as _set_value

    return _set_value(doctype, docname, fieldname, value)


def call(fn, *args, **kwargs):
    if isinstance(fn, str):
        fn = get_attr(fn)
    newargs = get_newargs(fn, kwargs)
    return fn(*args, **newargs)


def request_cache(fn):
    return fn


def is_setup_complete():
    return True


def read_only():
    def wrapper(fn):
        return fn

    return wrapper


def sendmail(recipients=None, subject="", message=None, content=None, sender=None, cc=None, bcc=None, attachments=None, reference_doctype=None, reference_name=None, now=None, delayed=True, **kwargs):
    from django.core.mail import EmailMessage

    recipients = [recipients] if isinstance(recipients, str) else list(recipients or [])
    if not recipients:
        return None
    mail = EmailMessage(subject=subject, body=message or content or "", from_email=sender, to=recipients, cc=cc or None, bcc=bcc or None)
    mail.content_subtype = "html"
    return mail.send(fail_silently=False)


def get_single_value(setting, fieldname, /, *, as_dict=False, **kwargs):
    return get_cached_value(setting, setting, fieldname=fieldname, as_dict=as_dict)


def are_emails_muted():
    return bool(conf.get("mute_emails"))


def only_has_select_perm(doctype, user=None, ignore_permissions=False):
    if ignore_permissions:
        return False

    user = user or session.user
    permissions = get_role_permissions_for(doctype, user)
    return permissions.get("select") and not permissions.get("read")


def get_role_permissions_for(doctype, user):
    from apps.frappe.permissions import get_role_permissions

    return get_role_permissions(doctype, user=user)


def make_property_setter(args, ignore_validate=False, validate_fields_for_doctype=True, is_system_generated=True, *, module=None):
    args = _dict(args)
    if not args.doctype_or_field:
        args.doctype_or_field = "DocField"
        if not args.property_type:
            args.property_type = db.get_value("DocField", {"parent": "DocField", "fieldname": args.property}, "fieldtype") or "Data"

    if not args.doctype:
        doctype_list = get_all("DocField", filters={"fieldname": args.fieldname}, pluck="parent", distinct=True)
    else:
        doctype_list = [args.doctype]

    for doctype in doctype_list:
        if not args.property_type:
            args.property_type = db.get_value("DocField", {"parent": doctype, "fieldname": args.fieldname}, "fieldtype") or "Data"

        ps = get_doc(
            {
                "doctype": "Property Setter",
                "doctype_or_field": args.doctype_or_field,
                "doc_type": doctype,
                "module": module,
                "field_name": args.fieldname,
                "row_name": args.row_name,
                "property": args.property,
                "value": args.value,
                "property_type": args.property_type or "Data",
                "is_system_generated": is_system_generated,
            }
        )
        ps.flags.ignore_validate = ignore_validate
        ps.flags.validate_fields_for_doctype = validate_fields_for_doctype
        ps.validate_fieldtype_change()
        ps.insert()


def get_single(doctype):
    return get_doc(doctype)


def publish_progress(percent, title=None, doctype=None, docname=None, description=None, task_id=None):
    return None


def clear_messages():
    local.message_log = []


def get_message_log():
    return list(local.message_log)


def get_document_cache_key(doctype, name):
    return f"document_cache::{doctype}::{name}"


def clear_document_cache(doctype, name=None):
    return None


def get_website_settings(key):
    from apps.frappe.exceptions import DoesNotExistError

    state = _state()
    if "website_settings" not in state:
        try:
            state.website_settings = get_doc("Website Settings")
        except DoesNotExistError:
            clear_last_message()
            return None
    return state.website_settings.get(key)


def get_active_domains():
    from apps.frappe.core.doctype.domain_settings.domain_settings import get_active_domains as _get_active_domains

    return _get_active_domains()


def attach_print(*args, **kwargs):
    from apps.frappe.utils.print_utils import attach_print as _attach_print

    return _attach_print(*args, **kwargs)


def write_only():
    def wrapper(fn):
        return fn

    return wrapper


def get_installed_apps(*, _ensure_on_bench=False):
    return ["frappe", "erpnext"]


def get_pymodule_path(modulename, *joins):
    import os

    from django.conf import settings

    return os.path.join(settings.BASE_DIR, "apps", *modulename.split("."), *joins)


def get_site_config(sites_path=None, site_path=None):
    return conf._conf()


def get_app_path(app_name, *joins):
    import os

    from django.conf import settings

    return os.path.join(settings.BASE_DIR, "apps", app_name, *joins)


def local_cache(namespace, key, generator, regenerate_if_none=False):
    cache = _state().setdefault("_local_cache", {})
    bucket = cache.setdefault(namespace, {})
    if key not in bucket or (regenerate_if_none and bucket[key] is None):
        bucket[key] = generator()
    return bucket[key]


def get_roles(user=None):
    from apps.frappe.permissions import get_roles as _get_roles

    return _get_roles(user)


def copy_doc(doc, ignore_no_copy=True):
    if isinstance(doc, dict):
        doc = get_doc(doc)
    return doc.copy_doc(ignore_no_copy=ignore_no_copy)


def get_cached_doc(doctype, name=None, **kwargs):
    return get_doc(doctype, name)


def get_lazy_doc(doctype, name=None, **kwargs):
    return get_doc(doctype, name, **kwargs)


def get_cached_value(doctype, name, fieldname="name", as_dict=False):
    from apps.frappe.exceptions import DoesNotExistError

    if get_meta_issingle(doctype):
        doc = get_doc(doctype, ignore_permissions=True)
        fields = [fieldname] if isinstance(fieldname, str) else list(fieldname)
        values = {f: doc.get(f) for f in fields}
        if as_dict:
            return _dict(values)
        return values[fields[0]] if isinstance(fieldname, str) else tuple(values[f] for f in fields)
    if isinstance(name, (dict, list, tuple)):
        return db.get_value(doctype, name, fieldname, as_dict=as_dict)
    fields = [fieldname] if isinstance(fieldname, str) else list(fieldname)
    columns = {field.name for field in resolve_model(doctype)._meta.fields}
    if all(field in columns for field in fields):
        if db.get_value(doctype, name, "name") is None:
            match = _case_insensitive_match(resolve_model(doctype), name)
            if match is None:
                return None
            name = match.name
        return db.get_value(doctype, name, fieldname, as_dict=as_dict)
    try:
        doc = get_doc(doctype, name, ignore_permissions=True)
    except DoesNotExistError:
        clear_last_message()
        return None
    if isinstance(fieldname, str):
        if as_dict:
            throw("Cannot make dict for single fieldname")
        return doc.get(fieldname)
    values = [doc.get(field) for field in fields]
    if as_dict:
        return _dict(zip(fields, values))
    return values


def get_meta_issingle(doctype):
    from apps.erpnext.registry import get_meta as _get_meta

    try:
        return bool(_get_meta(doctype).get("issingle"))
    except KeyError:
        return False


class Cache:
    def __init__(self, namespace="frappe"):
        self.namespace = namespace

    def _key(self, key):
        return f"{self.namespace}:{key}"

    def _store(self):
        from django.core.cache import cache as django_cache

        return django_cache

    def _index(self):
        return self._store().get(self._key("__index__")) or set()

    def _register(self, key):
        index = self._index()
        if key not in index:
            index.add(key)
            self._store().set(self._key("__index__"), index, timeout=None)

    def _unregister(self, key):
        index = self._index()
        if key in index:
            index.discard(key)
            self._store().set(self._key("__index__"), index, timeout=None)

    def __call__(self):
        return self

    def get_value(self, key, generator=None, user=None, expires=False, shared=False):
        value = self._store().get(self._key(key))
        if value is None and generator:
            value = generator()
            self.set_value(key, value, user=user, expires_in_sec=None)
        return value

    def set_value(self, key, val, user=None, expires_in_sec=None, shared=False):
        self._store().set(self._key(key), val, timeout=expires_in_sec)
        self._register(key)

    def delete_value(self, keys, user=None, make_keys=True, shared=False):
        for key in [keys] if isinstance(keys, str) else keys:
            self._store().delete(self._key(key))
            self._unregister(key)

    def delete_key(self, key):
        self._store().delete(self._key(key))
        self._unregister(key)

    def delete(self, *keys):
        for key in keys:
            self.delete_key(key)

    def get_keys(self, key, user=None, shared=False):
        from fnmatch import fnmatch

        pattern = key if "*" in key else key + "*"
        return [name for name in self._index() if fnmatch(name, pattern)]

    def delete_keys(self, key, user=None, shared=False):
        for name in self.get_keys(key, user=user, shared=shared):
            self.delete_key(name)

    def get(self, key):
        return self._store().get(self._key(key))

    def set(self, key, value, ex=None):
        self._store().set(self._key(key), value, timeout=ex)
        self._register(key)

    def setex(self, name, time, value):
        self.set(name, value, ex=time)

    def setnx(self, name, value):
        if self.get(name) is not None:
            return False
        self.set(name, value)
        return True

    def incrby(self, name, amount=1):
        value = int(self.get(name) or 0) + int(amount)
        self.set(name, value)
        return value

    def incr(self, name):
        return self.incrby(name, 1)

    def decr(self, name):
        return self.incrby(name, -1)

    def make_key(self, key, user=None, shared=False):
        return self._key(key)

    def ping(self):
        return True

    def flushdb(self):
        for name in list(self._index()):
            self.delete_key(name)

    def clear_cache(self):
        self.flushdb()

    def erase_persistent_caches(self, *, doctype=None):
        return None

    def expire_key(self, key, seconds):
        return self.expire(key, seconds)

    def get_doc(self, doctype, name=None):
        if not name:
            name = doctype
        key = get_document_cache_key(doctype, name)
        return self.get_value(key, generator=lambda: get_doc(doctype, name))

    def _list(self, name):
        value = self.get(name)
        return list(value) if value else []

    def lpush(self, name, *values):
        items = self._list(name)
        for value in values:
            items.insert(0, value)
        self.set(name, items)
        return len(items)

    def rpush(self, name, *values):
        items = self._list(name) + list(values)
        self.set(name, items)
        return len(items)

    def lpop(self, name):
        items = self._list(name)
        if not items:
            return None
        value = items.pop(0)
        self.set(name, items)
        return value

    def rpop(self, name):
        items = self._list(name)
        if not items:
            return None
        value = items.pop()
        self.set(name, items)
        return value

    def blpop(self, keys, timeout=0):
        for name in [keys] if isinstance(keys, str) else keys:
            value = self.lpop(name)
            if value is not None:
                return (name, value)
        return None

    def llen(self, name):
        return len(self._list(name))

    def lindex(self, name, index):
        items = self._list(name)
        try:
            return items[index]
        except IndexError:
            return None

    def lrange(self, name, start, end):
        items = self._list(name)
        stop = None if end == -1 else end + 1
        return items[start:stop]

    def ltrim(self, name, start, end):
        self.set(name, self.lrange(name, start, end))
        return True

    def _members(self, name):
        value = self.get(name)
        return set(value) if value else set()

    def sadd(self, name, *values):
        members = self._members(name)
        added = len(set(values) - members)
        members |= set(values)
        self.set(name, members)
        return added

    def srem(self, name, *values):
        members = self._members(name)
        removed = len(members & set(values))
        self.set(name, members - set(values))
        return removed

    def sismember(self, name, value):
        return value in self._members(name)

    def smembers(self, name):
        return self._members(name)

    def hkeys(self, name):
        return list((self.hgetall(name) or {}).keys())

    @contextlib.contextmanager
    def pipeline(self, transaction=True):
        yield self

    def execute(self):
        return []

    def execute_command(self, *args, **kwargs):
        raise NotImplementedError("Redis commands are not available on the Django cache backend")

    def exists(self, *keys, user=None, shared=False):
        return sum(1 for key in keys if self._store().get(self._key(key)) is not None)

    def hset(self, name, key, value, shared=False):
        data = self._store().get(self._key(name)) or {}
        data[key] = value
        self._store().set(self._key(name), data, timeout=None)
        self._register(name)

    def hget(self, name, key, generator=None, shared=False):
        data = self._store().get(self._key(name)) or {}
        value = data.get(key)
        if value is None and generator:
            value = generator()
            self.hset(name, key, value)
        return value

    def hgetall(self, name):
        return dict(self._store().get(self._key(name)) or {})

    def hdel(self, name, key, shared=False):
        data = self._store().get(self._key(name)) or {}
        data.pop(key, None)
        self._store().set(self._key(name), data, timeout=None)

    def hdel_names(self, names, key):
        for name in names:
            self.hdel(name, key)

    def hdel_keys(self, name_starts_with, key):
        for name in self.get_keys(name_starts_with):
            self.hdel(name, key)

    def expire(self, key, seconds):
        value = self._store().get(self._key(key))
        if value is not None:
            self._store().set(self._key(key), value, timeout=seconds)

    def lock(self, key, timeout=None):
        from contextlib import nullcontext

        return nullcontext()


cache = Cache()
client_cache = Cache("client")


def get_desk_link(doctype, name, open_in_new_tab=False):
    target = "_blank" if open_in_new_tab else "_self"
    route = f"/app/{scrub(doctype).replace('_', '-')}/{name}"
    return f'<a href="{route}" target="{target}">{name}</a>'


def get_last_doc(doctype, filters=None, order_by="creation desc"):
    rows = get_list(doctype, filters=filters, order_by=order_by, limit=1)
    if not rows:
        throw(f"{doctype} not found")
    return get_doc(doctype, rows[0]["name"])


def apply_filters(qs, filters, or_filters=None):
    from apps.frappe.model.db_query import apply_filters as _apply_filters

    return _apply_filters(qs, filters, or_filters)


def _is_filter_like(value):
    if isinstance(value, dict):
        return True
    return isinstance(value, (list, tuple)) and bool(value) and all(isinstance(item, (list, tuple, dict)) for item in value)


def get_list(doctype, *args, **kwargs):
    import apps.frappe.model.qb_query as qb_query

    return qb_query.DatabaseQuery(doctype).execute(*args, **kwargs)


def get_all(doctype, *args, **kwargs):
    kwargs["ignore_permissions"] = True
    if "limit_page_length" not in kwargs:
        kwargs["limit_page_length"] = 0
    return get_list(doctype, *args, **kwargs)


def resolve_model(doctype):
    from apps.erpnext.registry import get_model

    try:
        return get_model(doctype)
    except LookupError:
        pass
    extras = _extra_models()
    if doctype in extras:
        return extras[doctype]
    from django.apps import apps

    for model in apps.get_models():
        if getattr(model, "doctype", None) == doctype:
            return model
        if str(model._meta.verbose_name) == doctype:
            return model
        if model._meta.db_table == f"tab{doctype}":
            return model
    raise LookupError(f"Unknown doctype model: {doctype}")


def _extra_models():
    from apps.frappe.models import Auth, DocPerm, GlobalSearch, HasRole, Role, Series, Singles, UserPermission

    return {
        "DocPerm": DocPerm,
        "__global_search": GlobalSearch,
        "__Auth": Auth,
        "Has Role": HasRole,
        "Role": Role,
        "Series": Series,
        "Singles": Singles,
        "User Permission": UserPermission,
    }


def _meta_fields(doctype):
    from apps.erpnext.registry import get_meta

    try:
        return get_meta(doctype).get("fields", [])
    except KeyError:
        return []


def _single_default(field):
    if not field:
        return None
    fieldtype = field.get("fieldtype")
    default = field.get("default")
    if fieldtype == "Check":
        return int(default or 0) if str(default or 0).lstrip("-").isdigit() else 0
    if default in (None, ""):
        return None
    if fieldtype in {"Int", "Long Int"}:
        return int(float(default))
    if fieldtype in {"Float", "Currency", "Percent"}:
        return float(default)
    return default


def _cast_single(field, raw):
    if not field:
        return raw
    fieldtype = field.get("fieldtype")
    if fieldtype in {"Check", "Int", "Long Int"}:
        try:
            return int(float(raw)) if raw not in (None, "") else 0
        except ValueError:
            return 0
    if fieldtype in {"Float", "Currency", "Percent"}:
        try:
            return float(raw) if raw not in (None, "") else 0.0
        except ValueError:
            return 0.0
    return raw


def _sql_time_to_timedelta(value):
    import datetime

    if isinstance(value, datetime.time):
        return datetime.timedelta(
            hours=value.hour, minutes=value.minute, seconds=value.second, microseconds=value.microsecond
        )
    return value


def _sql_aware_to_naive(value):
    import datetime

    if isinstance(value, datetime.datetime) and value.tzinfo is not None:
        from django.utils import timezone

        return timezone.make_naive(value, timezone.get_default_timezone())
    return value


_SQL_CONVERTERS = {1083: _sql_time_to_timedelta, 1184: _sql_aware_to_naive}


class _TransactionCallbacks:
    def __init__(self):
        self.callbacks = []

    def add(self, fn):
        self.callbacks.append(fn)

    def run(self):
        callbacks, self.callbacks = self.callbacks, []
        for fn in callbacks:
            fn()

    def reset(self):
        self.callbacks = []


class Database:
    VARCHAR_LEN = 140
    MAX_COLUMN_LENGTH = 64
    OPTIONAL_COLUMNS = ("_user_tags", "_comments", "_assign", "_liked_by")
    DEFAULT_SHORTCUTS = ("_Login", "__user", "_Full Name", "Today", "__today", "now", "Now")
    STANDARD_VARCHAR_COLUMNS = ("name", "owner", "modified_by")
    DEFAULT_COLUMNS = ("name", "creation", "modified", "modified_by", "owner", "docstatus", "idx")
    CHILD_TABLE_COLUMNS = ("parent", "parenttype", "parentfield")
    REGEX_CHARACTER = "~"
    MAX_ROW_SIZE_LIMIT = None
    db_schema = "public"
    SQLError = DatabaseError
    ProgrammingError = DjangoProgrammingError
    OperationalError = DjangoOperationalError
    InternalError = DjangoInternalError
    DataError = DjangoDataError
    InterfaceError = DjangoInterfaceError

    class InvalidColumnName(Exception):
        pass

    class SequenceGeneratorLimitExceeded(Exception):
        pass

    type_map = {
        "Currency": ("decimal", "21,9"),
        "Int": ("int", None),
        "Long Int": ("bigint", None),
        "Float": ("decimal", "21,9"),
        "Percent": ("decimal", "21,9"),
        "Check": ("smallint", None),
        "Small Text": ("text", ""),
        "Long Text": ("text", ""),
        "Code": ("text", ""),
        "Text Editor": ("text", ""),
        "Markdown Editor": ("text", ""),
        "HTML Editor": ("text", ""),
        "Date": ("date", ""),
        "Datetime": ("timestamp", None),
        "Time": ("time", "6"),
        "Text": ("text", ""),
        "Data": ("varchar", 140),
        "Link": ("varchar", 140),
        "Dynamic Link": ("varchar", 140),
        "Password": ("text", ""),
        "Select": ("varchar", 140),
        "Rating": ("decimal", "3,2"),
        "Read Only": ("varchar", 140),
        "Attach": ("text", ""),
        "Attach Image": ("text", ""),
        "Signature": ("text", ""),
        "Color": ("varchar", 140),
        "Barcode": ("text", ""),
        "Geolocation": ("text", ""),
        "Duration": ("decimal", "21,9"),
        "Icon": ("varchar", 140),
        "Phone": ("varchar", 140),
        "Autocomplete": ("varchar", 140),
        "JSON": ("json", ""),
    }

    _last_description = None

    def __init__(self):
        self.value_cache = __import__("collections").defaultdict(lambda: __import__("collections").defaultdict(dict))
        self.before_commit = _TransactionCallbacks()
        self.after_commit = _TransactionCallbacks()
        self.before_rollback = _TransactionCallbacks()
        self.after_rollback = _TransactionCallbacks()
        self._disable_transaction_control = 0

    @property
    def cur_db_name(self):
        return connection.settings_dict["NAME"]

    def begin(self, *, read_only=False):
        if connection.in_atomic_block:
            self._reset_transaction_savepoint()
        return None

    _transaction_savepoint = None

    def _reset_transaction_savepoint(self):
        with connection.cursor() as cursor:
            if self._transaction_savepoint:
                cursor.execute(f'RELEASE SAVEPOINT "{self._transaction_savepoint}"')
            self._transaction_savepoint = f"frappe_tx_{secrets.token_hex(4)}"
            cursor.execute(f'SAVEPOINT "{self._transaction_savepoint}"')

    def get_global(self, key, user="__global"):
        return self.get_default(key, user)

    def set_global(self, key, val, user="__global"):
        self.set_default(key, val, user)


    def get_description(self):
        return self._last_description

    def mogrify(self, query, values):
        if not values:
            return query
        import psycopg

        return psycopg.ClientCursor(connection.connection).mogrify(query, values)

    @contextlib.contextmanager
    def execution_timeout(self, seconds):
        with connection.cursor() as cursor:
            cursor.execute("SHOW statement_timeout")
            previous = cursor.fetchone()[0]
            cursor.execute("SET LOCAL statement_timeout = %s", [int(seconds * 1000)])
        try:
            yield
        finally:
            with connection.cursor() as cursor:
                cursor.execute("SET LOCAL statement_timeout = %s", [previous])

    def get_tables(self, cached=True):
        rows = self.sql(
            """select table_name from information_schema.tables
            where table_catalog=%s and table_type = 'BASE TABLE' and table_schema=%s""",
            (self.cur_db_name, self.db_schema),
        )
        return [row[0] for row in rows]

    def describe(self, doctype):
        return self.sql(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = %(table_name)s AND table_schema = %(schema)s",
            {"table_name": f"tab{doctype}", "schema": self.db_schema},
        )

    def get_table_columns_description(self, table_name):
        return self.sql(
            """
            SELECT a.column_name AS name,
            CASE LOWER(a.data_type)
                WHEN 'character varying' THEN CONCAT('varchar(', a.character_maximum_length ,')')
                WHEN 'timestamp without time zone' THEN 'timestamp'
                WHEN 'time without time zone' THEN CONCAT('time(', a.datetime_precision, ')')
                WHEN 'integer' THEN 'int'
                WHEN 'numeric' THEN CONCAT('decimal(', a.numeric_precision, ',', a.numeric_scale, ')')
                ELSE a.data_type
            END AS type,
            false AS index,
            SPLIT_PART(COALESCE(a.column_default, NULL), '::', 1) AS default,
            false AS unique
            FROM information_schema.columns a
            WHERE a.table_name = %s AND a.table_schema = %s
            """,
            (table_name, self.db_schema),
            as_dict=True,
        )

    def rename_column(self, doctype, old_column_name, new_column_name):
        self.sql_ddl(f'ALTER TABLE "tab{doctype}" RENAME COLUMN "{old_column_name}" TO "{new_column_name}"')

    def create_auth_table(self):
        self.sql_ddl(
            """create table if not exists "__Auth" (
                "doctype" VARCHAR(140) NOT NULL,
                "name" VARCHAR(255) NOT NULL,
                "fieldname" VARCHAR(140) NOT NULL,
                "password" TEXT NOT NULL,
                "encrypted" INT NOT NULL DEFAULT 0,
                PRIMARY KEY ("doctype", "name", "fieldname")
            )"""
        )

    def set(self, doc, field, val):
        doc.db_set(field, val)

    @staticmethod
    def is_data_too_long(e):
        return getattr(getattr(e, "__cause__", e), "sqlstate", None) == "22001"

    @staticmethod
    def is_statement_timeout(e):
        return getattr(getattr(e, "__cause__", e), "sqlstate", None) == "57014"

    @staticmethod
    def is_interface_error(e):
        return isinstance(e, DjangoInterfaceError)

    @staticmethod
    def is_primary_key_violation(e):
        cause = getattr(e, "__cause__", e)
        constraint = getattr(getattr(cause, "diag", None), "constraint_name", "")
        return getattr(cause, "sqlstate", None) == "23505" and str(constraint).endswith("_pkey")

    @staticmethod
    def is_db_table_size_limit(e):
        return False

    db_type = "postgres"





    def get_singles_dict(self, doctype, debug=False, *, for_update=False, cast=False):
        from apps.erpnext.registry import get_meta
        from apps.frappe.models import Singles

        meta_fields = {f.get("fieldname"): f for f in _meta_fields(doctype) if f.get("fieldname")}
        result = _dict()
        for fieldname, field in meta_fields.items():
            if field.get("fieldtype") in {"Table", "Table MultiSelect"}:
                continue
            default = _single_default(field)
            if default is not None:
                result[fieldname] = default
        for row in Singles.objects.filter(doctype=doctype):
            result[row.field] = _cast_single(meta_fields.get(row.field), row.value)
        return result

    def sql(self, query, values=None, as_dict=False, as_list=False, **kwargs):
        if values == {}:
            values = None
        if values is not None and not isinstance(values, (list, tuple, dict)):
            values = (values,)
        from apps.frappe.database.postgres_compat import modify_query

        query = modify_query(query).replace("ifnull(", "coalesce(").replace("IFNULL(", "coalesce(")
        query = _BARE_TABLE_NAME.sub(r'\1\2"\3"', query)
        if values is None and "%%" in query:
            query = query.replace("%%", "%")
        if kwargs.get("run") is False:
            return str(query)
        with connection.cursor() as cursor:
            cursor.execute(query, values)
            if cursor.description is None:
                return []
            columns = [col[0] for col in cursor.description]
            self._last_description = cursor.description
            rows = cursor.fetchall()
            converters = {
                index: _SQL_CONVERTERS[col.type_code]
                for index, col in enumerate(cursor.description)
                if getattr(col, "type_code", None) in _SQL_CONVERTERS
            }
        if converters:
            rows = [
                tuple(converters[index](value) if index in converters else value for index, value in enumerate(row))
                for row in rows
            ]
        from decimal import Decimal
        if rows:
            rows = [
                tuple(float(v) if isinstance(v, Decimal) else v for v in row)
                for row in rows
            ]
        if kwargs.get("pluck"):
            return [row[0] for row in rows]
        if as_dict or kwargs.get("as_dict"):
            result = [_dict(zip(columns, row)) for row in rows]
            if kwargs.get("update"):
                for entry in result:
                    entry.update(kwargs["update"])
            return result
        if as_list:
            return [list(row) for row in rows]
        return tuple(rows)


    def get_value(
        self,
        doctype: str,
        filters: FilterValue | dict | list | None = None,
        fieldname: str | list[str] = "name",
        ignore: bool = False,
        as_dict: bool = False,
        debug: bool = False,
        order_by: str = DefaultOrderBy,
        cache: bool = False,
        for_update: bool = False,
        *,
        run: bool = True,
        pluck: bool = False,
        distinct: bool = False,
        skip_locked: bool = False,
        wait: bool = True,
    ):
        """Return a document property or list of properties.

        :param doctype: DocType name.
        :param filters: Filters like `{"x":"y"}` or name of the document. `None` if Single DocType.
        :param fieldname: Column name.
        :param ignore: Don't raise exception if table, column is missing.
        :param as_dict: Return values as dict.
        :param debug: Print query in error log.
        :param order_by: Column to order by
        :param cache: Use cached results fetched during current job/request
        :param pluck: pluck first column instead of returning as nested list or dict.
        :param for_update: All the affected/read rows will be locked.
        :param skip_locked: Skip selecting currently locked rows.
        :param wait: Wait for aquiring lock

        Example:

                # return first customer starting with a
                frappe.db.get_value("Customer", {"name": ("like a%")})

                # return last login of **User** `test@example.com`
                frappe.db.get_value("User", "test@example.com", "last_login")

                last_login, last_ip = frappe.db.get_value("User", "test@example.com",
                        ["last_login", "last_ip"])

                # returns default date_format
                frappe.db.get_value("System Settings", None, "date_format")
        """
        result = self.get_values(
            doctype,
            filters,
            fieldname,
            ignore,
            as_dict,
            debug,
            order_by,
            cache=cache,
            for_update=for_update,
            run=run,
            pluck=pluck,
            distinct=distinct,
            limit=1,
            skip_locked=skip_locked,
            wait=wait,
        )

        if not run:
            return result

        if not result:
            return None

        row = result[0]

        if as_dict or len(row) > 1:
            return row
        return row[0]

    def get_values(
        self,
        doctype: str,
        filters: FilterValue | dict | list | None = None,
        fieldname: str | list[str] = "name",
        ignore: bool = False,
        as_dict: bool = False,
        debug: bool = False,
        order_by: str = DefaultOrderBy,
        update: dict | None = None,
        cache: bool = False,
        for_update: bool = False,
        *,
        run: bool = True,
        pluck: bool = False,
        distinct: bool = False,
        limit: int | None = None,
        skip_locked: bool = False,
        wait: bool = True,
    ):
        """Return multiple document properties.

        :param doctype: DocType name.
        :param filters: Filters like `{"x":"y"}` or name of the document.
        :param fieldname: Column name.
        :param ignore: Don't raise exception if table, column is missing.
        :param as_dict: Return values as dict.
        :param debug: Print query in error log.
        :param order_by: Column to order by,
        :param distinct: Get Distinct results.

        Example:

                # return first customer starting with a
                customers = frappe.db.get_values("Customer", {"name": ("like a%")})

                # return last login of **User** `test@example.com`
                user = frappe.db.get_values("User", "test@example.com", "*")[0]
        """

        from frappe.model.utils import is_single_doctype

        out = None
        if isinstance(fieldname, list):
            fieldname = tuple(fieldname)

        if cache and isinstance(filters, str) and fieldname in self.value_cache[doctype][filters]:
            return self.value_cache[doctype][filters][fieldname]

        if distinct:
            order_by = None

        if isinstance(filters, list):
            if filters := list(f for f in filters if f is not None):
                out = frappe.qb.get_query(
                    table=doctype,
                    fields=fieldname,
                    filters=filters,
                    order_by=order_by,
                    distinct=distinct,
                    limit=limit,
                    for_update=for_update,
                    skip_locked=skip_locked,
                    wait=True,
                ).run(debug=debug, run=run, as_dict=as_dict, pluck=pluck)
            else:
                out = {}
        else:
            if (filters is not None) and (filters != doctype or doctype == "DocType"):
                try:
                    if order_by:
                        order_by = "creation" if order_by == DefaultOrderBy else order_by
                    query = frappe.qb.get_query(
                        table=doctype,
                        filters=filters,
                        order_by=order_by,
                        for_update=for_update,
                        skip_locked=skip_locked,
                        wait=wait,
                        fields=fieldname,
                        distinct=distinct,
                        limit=limit,
                    )
                    if isinstance(fieldname, str) and fieldname == "*":
                        as_dict = True
                    out = query.run(as_dict=as_dict, debug=debug, update=update, run=run, pluck=pluck)

                except Exception as e:
                    if ignore and (
                        frappe.db.is_missing_column(e)
                        or frappe.db.is_table_missing(e)
                        or str(e).startswith("Invalid DocType")
                    ):
                        out = None
                    else:
                        raise
            elif is_single_doctype(doctype):
                fields = [fieldname] if (isinstance(fieldname, str) and fieldname != "*") else fieldname
                out = self.get_values_from_single(
                    fields,
                    filters,
                    doctype,
                    as_dict,
                    debug,
                    update,
                    run=run,
                    pluck=pluck,
                    distinct=distinct,
                )
            else:
                return None

        if cache and isinstance(filters, str):
            self.value_cache[doctype][filters][fieldname] = out

        return out

    def get_values_from_single(
        self,
        fields,
        filters,
        doctype,
        as_dict=False,
        debug=False,
        update=None,
        *,
        run=True,
        pluck=False,
        distinct=False,
    ):
        """Get values from `tabSingles` (Single DocTypes) (internal).

        :param fields: List of fields,
        :param filters: Filters (dict).
        :param doctype: DocType name.
        """

        from frappe.model.meta import get_default_df

        meta = frappe.get_meta(doctype)

        def _cast(field, val):
            df = meta.get_field(field) or get_default_df(field)
            if not df:
                return val
            return cast_fieldtype(df.fieldtype, val)

        if fields == "*" or isinstance(filters, dict):
            values = self.get_singles_dict(doctype, cast=True)
            if isinstance(filters, dict):
                for key, value in filters.items():
                    if values.get(key) != value:
                        return []

            if as_dict:
                return [values] if values else []

            if isinstance(fields, list):
                return [list(map(values.get, fields))]

        else:
            r = frappe.qb.get_query(
                "Singles",
                filters={"field": ("in", tuple(fields)), "doctype": doctype},
                fields=["field", "value"],
                distinct=distinct,
            ).run(pluck=pluck, debug=debug, as_dict=False)

            if not run:
                return r

            if not r:
                return []

            r = _dict(r)
            for k, v in r.items():
                r[k] = _cast(k, v)

            if update:
                r.update(update)

            if not as_dict:
                return [[r.get(field) for field in fields]]

            return [r]




    auto_commit_on_many_writes = False
    MAX_WRITES_PER_TRANSACTION = 200_000
    last_query = None
    value_cache = {}

    class TableMissingError(Exception):
        pass

    def get_singles_value(self, *args, **kwargs):
        return self.get_single_value(*args, **kwargs)


    def has_table(self, doctype):
        return self.table_exists(doctype)


    def has_index(self, table_name, index_name):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM pg_indexes WHERE tablename = %s AND indexname = %s", [table_name, index_name]
            )
            return cursor.fetchone() is not None

    def get_index_name(self, fields):
        return "_".join(fields) + "_index"

    def get_column_index(self, table_name, fieldname, unique=False):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT indexname FROM pg_indexes WHERE tablename = %s AND indexdef LIKE %s",
                [table_name, f'%("{fieldname}")%'],
            )
            row = cursor.fetchone()
            return row[0] if row else None

    def add_unique(self, doctype, fields, constraint_name=None):
        model = resolve_model(doctype)
        columns = [fields] if isinstance(fields, str) else list(fields)
        name = constraint_name or ("unique_" + "_".join(columns))
        name = f"{model._meta.db_table}_{name}"[:63] if constraint_name else f"{model._meta.db_table}_{'_'.join(columns)}_unique"[:63]
        quoted = ", ".join(f'"{column}"' for column in columns)
        with connection.cursor() as cursor:
            cursor.execute(
                f'CREATE UNIQUE INDEX IF NOT EXISTS "{name}" ON "{model._meta.db_table}" ({quoted})'
            )

    def estimate_count(self, doctype):
        return resolve_model(doctype).objects.count()

    def sql_list(self, query, values=(), debug=False, **kwargs):
        return [row[0] for row in self.sql(query, values, **kwargs)]

    def multisql(self, sql_dict, values=(), **kwargs):
        query = sql_dict.get(self.db_type) or sql_dict.get("*") or sql_dict.get("standard")
        assert query is not None, f"multisql has no query for dialect {self.db_type!r} and no '*' fallback"
        return self.sql(query, values, **kwargs)

    def is_unique_key_violation(self, exc):
        return self.is_duplicate_entry(exc)

    def get_column_type(self, doctype, column):
        field = resolve_model(doctype)._meta.get_field(column)
        return field.db_type(connection)

    def change_column_type(self, doctype, column, type, nullable=False):
        table = resolve_model(doctype)._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f'ALTER TABLE "{table}" ALTER COLUMN "{column}" TYPE {type} USING "{column}"::{type}')



    def unbuffered_cursor(self):
        from contextlib import contextmanager

        @contextmanager
        def cursor_context():
            with connection.cursor() as cursor:
                yield cursor

        return cursor_context()

    def advisory_lock(self, key, timeout=None):
        from contextlib import contextmanager

        @contextmanager
        def lock():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_lock(hashtext(%s))", [str(key)])
            try:
                yield
            finally:
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_unlock(hashtext(%s))", [str(key)])

        return lock()

    def transaction_advisory_lock(self, key, timeout=None):
        from contextlib import contextmanager

        @contextmanager
        def lock():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", [str(key)])
            yield

        return lock()



    def table_exists(self, doctype, cached=True):
        try:
            model = resolve_model(doctype)
        except LookupError:
            return False
        from django.db import connection
        return model._meta.db_table in connection.introspection.table_names()

    def add_index(self, doctype, fields, index_name=None, using=None, where=None, include=None):
        import hashlib
        import re as _re

        model = resolve_model(doctype)
        table = model._meta.db_table
        columns = [_re.sub(r"\(.*\)", "", field) for field in fields]
        for column in (*columns, *(include or ())):
            if not _re.fullmatch(r"\w+", column):
                raise ValueError(f"Invalid index column: {column}")
        if using and using not in ("btree", "hash", "gist", "gin", "brin", "spgist", "gin_trgm", "gin_fulltext"):
            raise ValueError(f"Unsupported index method: {using}")
        name = index_name or f"{table}_{'_'.join(columns)}_index"
        if using or where or include:
            digest = hashlib.md5(f"{using}|{where}|{include}".encode(), usedforsecurity=False).hexdigest()[:6]
            name = f"{name}_{digest}"
        name = name[:63]
        quoted = ", ".join(f'"{column}"' for column in columns)
        method = ""
        if using == "gin_trgm":
            method = " USING gin"
            trgm_schema = _trigram_schema()
            if trgm_schema is None:
                return
            quoted = ", ".join(f'"{column}" "{trgm_schema}".gin_trgm_ops' for column in columns)
        elif using == "gin_fulltext":
            method = " USING gin"
            quoted = ", ".join(f"to_tsvector('english', coalesce(\"{column}\", ''))" for column in columns)
        elif using:
            method = f" USING {using}"
        statement = f'CREATE INDEX IF NOT EXISTS "{name}" ON "{table}"{method} ({quoted})'
        if include:
            statement += " INCLUDE (" + ", ".join(f'"{column}"' for column in include) + ")"
        if where:
            statement += f" WHERE {where}"
        with connection.cursor() as cursor:
            cursor.execute(statement)

    def truncate(self, doctype):
        resolve_model(doctype).objects.all().delete()


    def updatedb(self, doctype, meta=None):
        from apps.erpnext.registry import get_model

        if get_meta_issingle(doctype):
            return
        get_model(doctype)

    def get_table_columns(self, doctype):
        return [field.column for field in resolve_model(doctype)._meta.fields]

    def has_column(self, doctype, column):
        return column in {field.name for field in resolve_model(doctype)._meta.fields}

    def exists(self, dt, dn=None, cache=False, *, debug=False):
        """Return the document name of a matching document, or None.

        Note: `cache` only works if `dt` and `dn` are of type `str`.

        ## Examples

        Pass doctype and docname (only in this case we can cache the result)

        ```
        exists("User", "jane@example.org", cache=True)
        ```

        Pass a dict of filters including the `"doctype"` key:

        ```
        exists({"doctype": "User", "full_name": "Jane Doe"})
        ```

        Pass the doctype and a dict of filters:

        ```
        exists("User", {"full_name": "Jane Doe"})
        ```
        """
        if dt != "DocType" and dt == dn:
            return dn

        if isinstance(dt, dict):
            dt = dt.copy()
            dt, dn = dt.pop("doctype"), dt

        return self.get_value(dt, dn, ignore=True, cache=cache, order_by=None, debug=debug)

    def count(self, dt, filters=None, debug=False, cache=False, distinct: bool = True):
        """Return `COUNT(*)` for given DocType and filters."""
        cache_key = "COUNT(*)"
        if cache and not filters and cache_key in self.value_cache[dt]:
            return self.value_cache[dt][cache_key]

        count = frappe.qb.get_query(
            table=dt,
            filters=filters,
            fields=Count("*"),
            distinct=distinct,
        ).run(debug=debug)[0][0]

        if not filters and cache:
            self.value_cache[dt][cache_key] = count
        return count


    def escape(self, value, percent=True):
        if isinstance(value, bytes):
            value = value.decode("utf-8")
        text = "" if value is None else str(value)
        if percent:
            text = text.replace("%", "%%")
        return "'" + text.replace("'", "''") + "'"

    def _pgcode(self, exc):
        current = exc
        for _ in range(6):
            if current is None:
                return None
            code = getattr(current, "pgcode", None) or getattr(current, "sqlstate", None)
            if code:
                return code
            current = getattr(current, "__cause__", None)
        return None

    def is_missing_column(self, exc):
        return self._pgcode(exc) == "42703"

    def is_table_missing(self, exc):
        from apps.frappe.exceptions import DoesNotExistError

        return self._pgcode(exc) == "42P01" or isinstance(exc, (DoesNotExistError, LookupError))


    def is_duplicate_entry(self, exc):
        current = exc
        for _ in range(6):
            if current is None:
                return False
            if getattr(current, "pgcode", None) == "23505" or getattr(current, "sqlstate", None) == "23505":
                return True
            current = getattr(current, "__cause__", None)
        return False

    def get_next_sequence_val(self, *args, **kwargs):
        from apps.frappe.database.sequence import get_next_val

        return get_next_val(*args, **kwargs)

    def set_next_sequence_val(self, doctype_name, next_val, is_val_used=False, slug="_id_seq"):
        sequence_name = scrub(f"{doctype_name}{slug}")
        used = "true" if is_val_used else "false"
        self.sql(f"SELECT SETVAL('\"{sequence_name}\"', {int(next_val)}, {used})")

    def sql_ddl(self, query):
        if connection.vendor == "postgresql":
            query = query.replace("`", '"')
        with connection.cursor() as cursor:
            cursor.execute(query)

    def commit(self, *, chain=False):
        if self._disable_transaction_control:
            return
        self.before_rollback.reset()
        self.after_rollback.reset()
        self.before_commit.run()
        if not connection.in_atomic_block:
            transaction.commit()
        elif self._transaction_savepoint:
            self._reset_transaction_savepoint()
        self.value_cache.clear()
        self.after_commit.run()

    def rollback(self, *, save_point=None, chain=False):
        if save_point:
            with connection.cursor() as cursor:
                cursor.execute(f'ROLLBACK TO SAVEPOINT "{save_point}"')
            connection.needs_rollback = False
            self.value_cache.clear()
            return
        if self._disable_transaction_control:
            return
        self.before_commit.reset()
        self.after_commit.reset()
        self.before_rollback.run()
        if not connection.in_atomic_block:
            transaction.rollback()
        elif self._transaction_savepoint:
            with connection.cursor() as cursor:
                cursor.execute(f'ROLLBACK TO SAVEPOINT "{self._transaction_savepoint}"')
            connection.needs_rollback = False
        self.value_cache.clear()
        self.after_rollback.run()

    def savepoint(self, name):
        with connection.cursor() as cursor:
            cursor.execute(f'SAVEPOINT "{name}"')

    def release_savepoint(self, name):
        with connection.cursor() as cursor:
            cursor.execute(f'RELEASE SAVEPOINT "{name}"')

    @staticmethod
    def _get_update_dict(
        fieldname: str | dict, value: Any, *, modified: str, modified_by: str, update_modified: bool
    ) -> dict[str, Any]:
        """Create update dict that represents column-values to be updated."""
        update_dict = fieldname if isinstance(fieldname, dict) else {fieldname: value}

        if update_modified:
            modified = modified or now()
            modified_by = modified_by or frappe.session.user
            update_dict.update({"modified": modified, "modified_by": modified_by})

        assert isinstance(update_dict, dict), "update dict must be a dict"
        return update_dict

    def set_single_value(
        self,
        doctype: str,
        fieldname: str | dict,
        value: str | int | None = None,
        *,
        modified=None,
        modified_by=None,
        update_modified=True,
        debug=False,
    ):
        """Set field value of Single DocType.

        :param doctype: DocType of the single object
        :param fieldname: `fieldname` of the property
        :param value: `value` of the property

        Example:

                # Update the `deny_multiple_sessions` field in System Settings DocType.
                frappe.db.set_single_value("System Settings", "deny_multiple_sessions", True)
        """

        to_update = self._get_update_dict(
            fieldname, value, modified=modified, modified_by=modified_by, update_modified=update_modified
        )

        frappe.db.delete(
            "Singles", filters={"field": ("in", tuple(to_update)), "doctype": doctype}, debug=debug
        )

        singles_data = ((doctype, key, sbool(value)) for key, value in to_update.items())
        frappe.qb.into("Singles").columns("doctype", "field", "value").insert(*singles_data).run(debug=debug)
        frappe.clear_document_cache(doctype, doctype)

    def set_value(
        self,
        dt: str,
        dn: FilterValue | dict,
        field: str,
        val=None,
        modified=None,
        modified_by=None,
        update_modified=True,
        debug=False,
    ):
        """Set a single value in the database, do not call the ORM triggers
        but update the modified timestamp (unless specified not to).

        **Warning:** this function will not call Document events and should be avoided in normal cases.

        :param dt: DocType name.
        :param dn: Document name for updating single record or filters for updating many records.
        :param field: Property / field name or dictionary of values to be updated
        :param value: Value to be updated.
        :param modified: Use this as the `modified` timestamp.
        :param modified_by: Set this user as `modified_by`.
        :param update_modified: default True. Set as false, if you don't want to update the timestamp.
        :param debug: Print the query in the developer / js console.
        """
        from frappe.model.utils import is_single_doctype

        if dn is None or dt == dn:
            if not is_single_doctype(dt):
                return
            from frappe.deprecation_dumpster import deprecation_warning

            deprecation_warning(
                "unknown",
                "v17",
                "Calling db.set_value on single doctype is deprecated. This behaviour will be removed in future. Use db.set_single_value instead.",
            )
            self.set_single_value(
                doctype=dt,
                fieldname=field,
                value=val,
                debug=debug,
                update_modified=update_modified,
                modified=modified,
                modified_by=modified_by,
            )
            return

        to_update = self._get_update_dict(
            field, val, modified=modified, modified_by=modified_by, update_modified=update_modified
        )

        query = frappe.qb.get_query(
            table=dt,
            filters=dn,
            update=True,
        )

        if isinstance(dn, FilterValue):
            frappe.clear_document_cache(dt, convert_to_value(dn))
        else:
            frappe.clear_document_cache(dt)

        for column, value in to_update.items():
            query = query.set(column, value)

        query.run(debug=debug)

    def bulk_update(
        self,
        doctype: str,
        doc_updates: dict,
        *,
        chunk_size: int = 100,
        modified: str | None = None,
        modified_by: str | None = None,
        update_modified: bool = True,
        debug: bool = False,
    ):
        """
        :param doctype: DocType to update
        :param doc_updates: Dictionary of key (docname) and values to update
        :param chunk_size: Number of documents to update in a single transaction
        :param modified: Use this as the `modified` timestamp.
        :param modified_by: Set this user as `modified_by`.
        :param update_modified: default True. Update `modified` and `modified_by` fields
        :param debug: Print the query in the developer / js console.

        doc_updates should be in the following format:
        ```py
        {
            "docname1": {
                "field1": "value1",
                "field2": "value2",
                ...
            },
            "docname2": {
                "field1": "value1",
                "field2": "value2",
                ...
            },
        }
        ```

        Note:
            - Bigger chunk sizes could be less performant. Use appropriate chunk size based on the number of fields to update.

        """
        if not doc_updates:
            return

        modified_dict = None
        if update_modified:
            modified_dict = self._get_update_dict(
                {}, None, modified=modified, modified_by=modified_by, update_modified=update_modified
            )

        total_docs = len(doc_updates)
        iterator = iter(doc_updates.items())

        for __ in range(0, total_docs, chunk_size):
            doc_chunk = dict(itertools.islice(iterator, chunk_size))
            self._build_and_run_bulk_update_query(doctype, doc_chunk, modified_dict, debug)

    @staticmethod
    def _build_and_run_bulk_update_query(
        doctype: str, doc_updates: dict, modified_dict: dict | None = None, debug: bool = False
    ):
        """
        :param doctype: DocType to update
        :param doc_updates: Dictionary of key (docname) and values to update
        :param debug: Print the query in the developer / js console.

        ---

        doc_updates should be in the following format:
        ```py
        {
            "docname1": {
                "field1": "value1",
                "field2": "value2",
                ...
            },
            "docname2": {
                "field1": "value1",
                "field2": "value2",
                ...
            },
        }
        ```

        ---

        Query will be built as:
        ```sql
        UPDATE `tabTask`
        SET `status` = CASE
            WHEN `name` = 'TASK-0001' THEN 'Closed'
            WHEN `name` = 'TASK-0002' THEN 'Open'
            WHEN `name` = 'TASK-0003' THEN 'Closed'
            WHEN `name` = 'TASK-0004' THEN 'Cancelled'
            ELSE `status`
        END,
        `description` = CASE
            WHEN `name` = 'TASK-0001' THEN 'This is the first task'
            WHEN `name` = 'TASK-0002' THEN 'This is the second task'
            WHEN `name` = 'TASK-0003' THEN 'This is the third task'
            WHEN `name` = 'TASK-0004' THEN 'This is the fourth task'
            ELSE `description`
        END
        WHERE `name` IN ('TASK-0001', 'TASK-0002', 'TASK-0003', 'TASK-0004');
        ```
        """
        if not doc_updates:
            return

        dt = frappe.qb.DocType(doctype)
        update_query = frappe.qb.update(dt)

        conditions = {}
        docnames = list(doc_updates.keys())
        assert docnames, "doc_updates must be non-empty here (empty case returns early)"

        for docname, row in doc_updates.items():
            for field, value in row.items():
                if field not in conditions:
                    conditions[field] = Case()

                conditions[field].when(dt.name == docname, value)

        for field in conditions:
            update_query = update_query.set(dt[field], conditions[field].else_(dt[field]))

        if modified_dict:
            for column, value in modified_dict.items():
                update_query = update_query.set(dt[column], value)

        update_query.where(dt.name.isin(docnames)).run(debug=debug)

    def get(self, doctype, filters=None, as_dict=True, cache=False):
        """Return `get_value` with fieldname='*'."""
        return self.get_value(doctype, filters, "*", as_dict=as_dict, cache=cache)

    @staticmethod
    def get_all(*args, **kwargs):
        return frappe.get_all(*args, **kwargs)

    @staticmethod
    def get_list(*args, **kwargs):
        return frappe.get_list(*args, **kwargs)

    def get_single_value(
        self,
        doctype: str,
        fieldname: str,
        cache: bool = True,
        *,
        debug=False,
        for_update=False,
        run=True,
    ):
        """Get property of Single DocType. Cache locally by default

        :param doctype: DocType of the single object whose value is requested
        :param fieldname: `fieldname` of the property whose value is requested

        Example:

                # Get the default value of the company from the Global Defaults doctype.
                company = frappe.db.get_single_value('Global Defaults', 'default_company')
        """
        from frappe.model.meta import get_default_df

        if cache and not for_update and run and fieldname in self.value_cache[doctype]:
            return self.value_cache[doctype][fieldname]

        val = frappe.qb.get_query(
            table="Singles",
            filters={"doctype": doctype, "field": fieldname},
            fields="value",
            for_update=for_update,
        ).run(debug=debug, run=run)
        if not run:
            return val

        val = val[0][0] if val else None

        df = frappe.get_meta(doctype).get_field(fieldname) or get_default_df(fieldname)

        if not df:
            frappe.throw(
                _("Field {0} does not exist on {1}").format(
                    frappe.bold(fieldname), frappe.bold(doctype), self.InvalidColumnName
                )
            )

        val = cast_fieldtype(df.fieldtype, val)

        if cache and not for_update and run:
            self.value_cache[doctype][fieldname] = val

        return val

    def get_default(self, key, parent="__default"):
        """Return default value as a list if multiple or single."""
        d = self.get_defaults(key, parent)
        return (isinstance(d, list) and d[0]) or d

    @staticmethod
    def set_default(key, val, parent="__default", parenttype=None):
        """Sets a global / user default value."""
        frappe.defaults.set_default(key, val, parent, parenttype)

    @staticmethod
    def add_default(key, val, parent="__default", parenttype=None):
        """Append a default value for a key, there can be multiple default values for a particular key."""
        frappe.defaults.add_default(key, val, parent, parenttype)

    @staticmethod
    def get_defaults(key=None, parent="__default"):
        """Get all defaults"""
        defaults = frappe.defaults.get_defaults_for(parent)
        if not key:
            return defaults

        if key in defaults:
            return defaults[key]

        return defaults.get(frappe.scrub(key))

    def field_exists(self, dt, fn):
        """Return true of field exists."""
        return self.exists("DocField", {"fieldname": fn, "parent": dt})

    def a_row_exists(self, doctype):
        """Return True if at least one row exists."""
        return frappe.get_all(doctype, limit=1, order_by=None, as_list=True)

    @staticmethod
    def format_date(date):
        return getdate(date).strftime("%Y-%m-%d")

    @staticmethod
    def format_datetime(datetime):
        if not datetime:
            return FallBackDateTimeStr

        return get_datetime(datetime).strftime("%Y-%m-%d %H:%M:%S.%f")

    def get_creation_count(self, doctype, minutes):
        """Get count of records created in the last x minutes"""
        from dateutil.relativedelta import relativedelta

        from frappe.utils import now_datetime

        dt = frappe.qb.DocType(doctype)

        return (
            frappe.qb.from_(dt)
            .select(Count(dt.name))
            .where(dt.creation >= now_datetime() - relativedelta(minutes=minutes))
            .run()[0][0]
        )

    def get_system_setting(self, key):
        return frappe.get_system_settings(key)

    def get_descendants(self, doctype, name):
        """Return descendants of the group node in tree"""
        from frappe.utils.nestedset import get_descendants_of

        try:
            return get_descendants_of(doctype, name, ignore_permissions=True)
        except Exception:
            return []

    def is_missing_table_or_column(self, e):
        return self.is_missing_column(e) or self.is_table_missing(e)

    def delete(self, doctype: str, filters: dict | list | None = None, debug=False, **kwargs):
        """Delete rows from a table in site which match the passed filters. This
        does not trigger DocType hooks. Simply runs a DELETE query in the database.

        Doctype name can be passed directly, it will be pre-pended with `tab`.
        """
        filters = filters or kwargs.get("conditions")
        query = frappe.qb.get_query(
            table=doctype,
            filters=filters,
            delete=True,
        )
        if "debug" not in kwargs:
            kwargs["debug"] = debug
        return query.run(**kwargs)

    def get_last_created(self, doctype):
        last_record = self.get_all(doctype, ("creation"), limit=1, order_by="creation desc")
        if last_record:
            return get_datetime(last_record[0].creation)
        else:
            return None

    def bulk_insert(
        self,
        doctype: str,
        fields: list[str],
        values: Iterable[Sequence[Any]],
        ignore_duplicates=False,
        *,
        chunk_size=1000,
    ):
        """
        Insert multiple records at a time

        :param doctype: Doctype name
        :param fields: list of fields
        :params values: iterable of values
        """
        table = frappe.qb.DocType(doctype)

        query = frappe.qb.into(table).columns(fields)

        if ignore_duplicates:
            if frappe.conf.db_type in ("mariadb", "sqlite"):
                query = query.ignore()
            elif frappe.conf.db_type == "postgres":
                query = query.on_conflict().do_nothing()

        value_iterator = iter(values)
        while value_chunk := tuple(itertools.islice(value_iterator, chunk_size)):
            query.insert(*value_chunk).run()


db = Database()


def log(msg: str) -> None:
    """Add to `debug_log`

    :param msg: Message."""
    from apps.frappe.utils import as_unicode

    print(msg, file=sys.stderr)
    local.debug_log.append(as_unicode(msg))


def get_domain_data(module):
    from frappe.utils import get_attr

    try:
        domain_data = get_hooks("domains")
        if module in domain_data:
            return _dict(get_attr(get_hooks("domains")[module][0] + ".data"))
        else:
            return _dict()
    except ImportError:
        if in_test:
            return _dict()
        else:
            raise


def is_table(doctype: str) -> bool:
    """Return True if `istable` property (indicating child Table) is set for given DocType."""
    key = "is_table"
    tables = client_cache.get_value(key)
    if tables is None:
        tables = db.get_values("DocType", filters={"istable": 1}, order_by=None, pluck=True)
        client_cache.set_value(key, tables)
    return doctype in tables


def get_meta_module(doctype):
    import frappe.modules

    return frappe.modules.load_doctype_module(doctype)


def append_hook(target, key, value):
    """appends a hook to the the target dict.

    If the hook key, exists, it will make it a key.

    If the hook value is a dict, like doc_events, it will
    listify the values against the key.
    """
    if isinstance(value, dict):
        target.setdefault(key, {})
        for inkey in value:
            append_hook(target[key], inkey, value[inkey])
    else:
        target.setdefault(key, [])
        if not isinstance(value, list):
            value = [value]
        target[key].extend(value)


@functools.lru_cache
def _get_cached_signature_params(fn: Callable) -> tuple[dict[str, Any], bool]:
    """
    Get cached parameters for a function.
    Returns a dictionary of parameters and a boolean indicating if the function has **kwargs.
    """

    signature = inspect.signature(fn)

    variable_kwargs_exist = any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD for parameter in signature.parameters.values()
    )

    return dict(signature.parameters), variable_kwargs_exist


def get_newargs(fn: Callable, kwargs: dict[str, Any]) -> dict[str, Any]:
    """Remove any kwargs that are not supported by the function.

    Example:
            >>> def fn(a=1, b=2):
            ...     pass

            >>> get_newargs(fn, {"a": 2, "c": 1})
                    {"a": 2}
    """

    parameters, variable_kwargs_exist = _get_cached_signature_params(fn)
    newargs = (
        kwargs.copy()
        if variable_kwargs_exist
        else {key: value for key, value in kwargs.items() if key in parameters}
    )

    newargs.pop("ignore_permissions", None)
    newargs.pop("flags", None)

    return newargs


def redirect(url):
    """Raise a 301 redirect to url"""
    from frappe.exceptions import Redirect

    flags.redirect_location = url
    raise Redirect


def get_doctype_app(doctype):
    def _get_doctype_app():
        doctype_module = local.db.get_value("DocType", doctype, "module")
        return local.module_app[scrub(doctype_module)]

    return local_cache("doctype_app", doctype, generator=_get_doctype_app)


@whitelist(allow_guest=True)
def ping():
    return "pong"


def override_whitelisted_method(original_method: str) -> str:
    """Return the last override or the original whitelisted method."""
    overrides = get_hooks("override_whitelisted_methods", {}).get(original_method, [])
    return overrides[-1] if overrides else original_method


class _FrappeModule:
    def __getattr__(self, name):
        import frappe as _frappe

        return getattr(_frappe, name)


frappe = _FrappeModule()


def cast_fieldtype(fieldtype, value=None):
    from apps.frappe.utils.data import cast

    return cast(fieldtype, value)


def Count(*args, **kwargs):
    from apps.frappe.query_builder.functions import Count as _Count

    return _Count(*args, **kwargs)


def now():
    from apps.frappe.utils.data import now as _now

    return _now()


def sbool(value):
    from apps.frappe.utils.data import sbool as _sbool

    return _sbool(value)


def convert_to_value(value):
    from apps.frappe.database.utils import convert_to_value as _convert_to_value

    return _convert_to_value(value)


def Case(*args, **kwargs):
    from apps.frappe.query_builder import Case as _Case

    return _Case(*args, **kwargs)


FallBackDateTimeStr = "0001-01-01 00:00:00.000000"


def getdate(*args, **kwargs):
    from apps.frappe.utils.data import getdate as _getdate

    return _getdate(*args, **kwargs)


def get_datetime(*args, **kwargs):
    from apps.frappe.utils.data import get_datetime as _get_datetime

    return _get_datetime(*args, **kwargs)
