from __future__ import annotations

import contextvars
import importlib
import json
import secrets

from django.db import connection, transaction


class _dict(dict):
    __getattr__ = dict.get
    __setattr__ = dict.__setitem__
    __delattr__ = dict.__delitem__

    def update(self, *args, **kwargs):
        super().update(*args, **kwargs)
        return self

    def copy(self):
        return _dict(self)


_local = contextvars.ContextVar("frappe_local", default=_dict())


def _state():
    value = _local.get()
    if not isinstance(value, _dict):
        value = _dict(value)
        _local.set(value)
    value.setdefault("session", _dict(user="Administrator"))
    value.setdefault("flags", _dict(currently_saving=[]))
    value.setdefault("conf", _dict(db_type="postgres"))
    value.setdefault("lang", "en")
    value.setdefault("site", None)
    value.setdefault("role_permissions", {})
    value.setdefault("request", None)
    value.setdefault("form_dict", _dict())
    value.setdefault("message_log", [])
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
            return {app: _read_modules(app) for app in ("frappe", "erpnext")}
        state = _state()
        if key not in state:
            raise AttributeError(key)
        return state[key]

    def __setattr__(self, key, value):
        setattr(_state(), key, value)


class _SessionProxy:
    def __getattr__(self, key):
        return getattr(_state().session, key)

    def __setattr__(self, key, value):
        setattr(_state().session, key, value)


class _FlagsProxy:
    def __getattr__(self, key):
        return getattr(_state().flags, key)

    def __setattr__(self, key, value):
        setattr(_state().flags, key, value)


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


def throw(message, exc=None, title=None, **kwargs):
    if exc is None:
        from apps.frappe.exceptions import ValidationError

        exc = ValidationError
    raise exc(message)


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


def msgprint(message, *args, raise_exception=False, **kwargs):
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


def has_permission(doctype, ptype="read", doc=None, user=None, parent_doctype=None, throw=False, **kwargs):
    from apps.frappe.permissions import has_permission as _has_permission
    from apps.frappe.permissions import raise_permission_error

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
        return json.loads(value)
    return value


def as_json(value):
    return json.dumps(value, default=str)


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


def whitelist(allow_guest=False, xss_safe=False, methods=None, force_types=None):
    def register(fn, allow_guest=False, methods=None):
        fn.whitelisted = True
        fn.allow_guest = bool(allow_guest)
        fn.allowed_http_methods = [m.upper() for m in methods] if methods else None
        whitelisted.add(fn)
        return fn

    if callable(allow_guest):
        return register(allow_guest)

    def inner(fn):
        return register(fn, allow_guest=allow_guest, methods=methods)

    return inner


def is_whitelisted(method):
    from apps.frappe.exceptions import PermissionError

    if method not in whitelisted:
        raise PermissionError(f"Method not whitelisted: {getattr(method, '__name__', method)}")


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
    module_name, attr_name = path.rsplit(".", 1)
    return getattr(importlib.import_module(path.rsplit(".", 1)[0]), attr_name)


def get_module(path):
    return importlib.import_module(path)


HOOK_APPS = ("apps.frappe.hooks", "apps.erpnext.hooks", "apps.hrms.hooks")
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
            kept = tuple(doctype for doctype in doctypes if doctype in registered)
            for doctype in doctypes:
                if doctype not in registered:
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


def get_hooks(hook=None, default=None, app_name=None):
    hooks = _load_hooks()
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


def get_system_settings(key=None):
    defaults = {
        "rounding_method": "Banker's Rounding",
    }
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


class Meta(_dict):
    def get(self, key, default=None, limit=None):
        filters = default if isinstance(default, (dict, list, tuple)) and key in ("fields", "permissions", "actions", "links", "states") else None
        value = dict.get(self, key, None if filters is not None else default)
        if key in ("fields", "permissions", "actions", "links", "states") and isinstance(value, list):
            rows = [_dict(item) if isinstance(item, dict) and not isinstance(item, _dict) else item for item in value]
            if filters:
                rows = [row for row in rows if _row_matches(row, filters)]
            if limit:
                rows = rows[:limit]
            return rows
        if value is None and filters is not None:
            return []
        return value

    def has_field(self, fieldname):
        if fieldname in {
            "name",
            "owner",
            "creation",
            "modified",
            "modified_by",
            "docstatus",
            "idx",
            "parent",
            "parentfield",
            "parenttype",
            "lft",
            "rgt",
            "old_parent",
        }:
            return True
        return any(field.get("fieldname") == fieldname for field in (self.get("fields") or []))

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

    def get_permitted_fieldnames(self, parenttype=None, *, user=None, permission_type="read"):
        from apps.frappe.permissions import get_permitted_fields

        return get_permitted_fields(self.get("name"), user=user, ptype=permission_type)

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

    def get_set_only_once_fields(self):
        return [f for f in self.fields if f.get("set_only_once")]

    def get_masked_fields(self, parenttype=None):
        return []

    def get_options(self, fieldname):
        field = self.get_field(fieldname)
        return field.get("options") if field else None

    def get_label(self, fieldname):
        field = self.get_field(fieldname)
        return field.get("label") if field else fieldname

    def get_fieldnames_with_value(self, with_field_meta=False):
        no_value = {"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold", "Image"}
        fields = [f for f in self.fields if f.get("fieldtype") not in no_value]
        return fields if with_field_meta else [f.get("fieldname") for f in fields]

    def get_search_fields(self):
        raw = self.get("search_fields") or ""
        return [field.strip() for field in raw.split(",") if field.strip()]

    def get_valid_columns(self):
        columns = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"]
        if self.get("istable"):
            columns += ["parent", "parenttype", "parentfield"]
        if self.get("is_tree"):
            columns += ["lft", "rgt", "old_parent"]
        return columns + [f for f in self.get_fieldnames_with_value() if not self.get_field(f).get("is_virtual")]

    def get_translated_label(self, fieldname):
        field = self.get_field(fieldname)
        return field.label if field and field.get("label") else fieldname

    @property
    def fields(self):
        return [_dict(field) for field in (self.get("fields") or [])]

    def get_translated_label(self, fieldname):
        field = self.get_field(fieldname)
        return field.label if field and field.get("label") else fieldname

    def get_title_field(self):
        title_field = self.get("title_field")
        if not title_field and self.has_field("title"):
            title_field = "title"
        if not title_field:
            title_field = "name"
        return title_field


def get_meta(doctype, cached=True, **kwargs):
    from apps.erpnext.registry import get_meta as _get_meta
    from apps.frappe.exceptions import DoesNotExistError

    try:
        data = _get_meta(doctype)
    except KeyError as exc:
        raise DoesNotExistError(doctype) from exc
    return Meta(data)


def _loaded_value(value):
    import decimal

    if hasattr(value, "email") and hasattr(value, "_meta") and getattr(value._meta, "model_name", "") == "user":
        return value.email
    return float(value) if isinstance(value, decimal.Decimal) else value


def new_doc(doctype, *, parent_doc=None, parentfield=None, as_dict=False, **kwargs):
    from apps.erpnext.registry import get_controller
    from apps.frappe.model.document import Document

    try:
        controller = get_controller(doctype)
    except (KeyError, AttributeError):
        controller = Document
    doc = controller({"doctype": doctype}).apply_dynamic_defaults()
    if parent_doc is not None:
        doc.parent = parent_doc.name
        doc.parenttype = parent_doc.doctype
        doc.parentfield = parentfield
        doc.idx = len(parent_doc.get(parentfield) or []) + 1
    if kwargs:
        doc.update(kwargs)
    return doc.as_dict() if as_dict else doc


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


def _get_doc(doctype, name=None, ignore_permissions=False, for_update=False, check_permission=None, **kwargs):
    from apps.erpnext.registry import get_controller, get_meta, get_model
    from apps.frappe.model.document import Document

    if isinstance(doctype, dict):
        try:
            controller = get_controller(doctype.get("doctype"))
        except (KeyError, AttributeError):
            controller = Document
        return controller(doctype)
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
                    child_data["doctype"] = field["options"]
                    rows.append(get_doc(child_data, ignore_permissions=True))
                data[field["fieldname"]] = rows
        try:
            controller = get_controller(doctype)
        except (KeyError, AttributeError):
            controller = Document
        single = controller(data)
        if not ignore_permissions:
            single.check_permission("read")
        return single
    model = get_model(doctype)
    from apps.frappe.exceptions import DoesNotExistError

    if isinstance(name, dict):
        match = apply_filters(model.objects.all(), name).first()
        if match is None:
            raise DoesNotExistError(f"{doctype} {name} not found", doctype=doctype)
        name = match.pk
    try:
        queryset = model.objects.select_for_update() if for_update else model.objects
        obj = queryset.get(pk=name)
    except model.DoesNotExist:
        raise DoesNotExistError(f"{doctype} {name} not found", doctype=doctype) from None
    data = {field.name: _loaded_value(getattr(obj, field.name)) for field in obj._meta.fields}
    data["doctype"] = doctype
    for field in get_meta(doctype).get("fields", []):
        if field.get("fieldtype") not in {"Table", "Table MultiSelect"} or not field.get("options"):
            continue
        try:
            child_model = get_model(field["options"])
        except LookupError:
            continue
        rows = []
        for child in child_model.objects.filter(parent=name, parentfield=field["fieldname"], parenttype=doctype).order_by("idx"):
            child_data = {child_field.name: _loaded_value(getattr(child, child_field.name)) for child_field in child._meta.fields}
            child_data["doctype"] = field["options"]
            rows.append(get_doc(child_data, ignore_permissions=True))
        data[field["fieldname"]] = rows
    try:
        controller = get_controller(doctype)
    except (KeyError, AttributeError):
        controller = Document
    doc = controller(data)
    if not ignore_permissions:
        doc.check_permission("read")
    return doc


def get_module_path(module, *joins):
    import os

    from django.conf import settings

    return os.path.join(settings.BASE_DIR, "apps", "erpnext", scrub(module), *joins)


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

    logging.getLogger("frappe").error("%s: %s", title or "Error", message or get_traceback())


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
    return fn(*args, **kwargs)


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


def get_single_value(doctype, fieldname, cache=True):
    return db.get_single_value(doctype, fieldname)


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


def clear_document_cache(doctype, name):
    return None


def get_website_settings(key):
    return None


def get_active_domains():
    return []


def attach_print(*args, **kwargs):
    raise NotImplementedError("Print formats are not ported yet")


def write_only():
    def wrapper(fn):
        return fn

    return wrapper


def get_installed_apps(*, _ensure_on_bench=False):
    return ["frappe", "erpnext"]


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
    return doc.copy_doc(ignore_no_copy=ignore_no_copy)


def get_cached_doc(doctype, name=None, **kwargs):
    return get_doc(doctype, name)


def get_lazy_doc(doctype, name=None, **kwargs):
    return get_doc(doctype, name, **kwargs)


def get_cached_value(doctype, name, fieldname="name", as_dict=False):
    if get_meta_issingle(doctype):
        doc = get_doc(doctype, ignore_permissions=True)
        fields = [fieldname] if isinstance(fieldname, str) else list(fieldname)
        values = {f: doc.get(f) for f in fields}
        if as_dict:
            return _dict(values)
        return values[fields[0]] if isinstance(fieldname, str) else tuple(values[f] for f in fields)
    if isinstance(name, (dict, list, tuple)):
        return db.get_value(doctype, name, fieldname, as_dict=as_dict)
    if db.get_value(doctype, name, "name") is None:
        return None
    return db.get_value(doctype, name, fieldname, as_dict=as_dict)


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

    def delete_value(self, keys, user=None, make_keys=True, shared=False):
        for key in [keys] if isinstance(keys, str) else keys:
            self._store().delete(self._key(key))

    def delete_key(self, key):
        self._store().delete(self._key(key))

    def delete_keys(self, key):
        return None

    def get(self, key):
        return self._store().get(self._key(key))

    def set(self, key, value, ex=None):
        self._store().set(self._key(key), value, timeout=ex)

    def exists(self, *keys):
        return sum(1 for key in keys if self._store().get(self._key(key)) is not None)

    def hset(self, name, key, value, shared=False):
        data = self._store().get(self._key(name)) or {}
        data[key] = value
        self._store().set(self._key(name), data, timeout=None)

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
        return None

    def expire(self, key, seconds):
        return None

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


def get_list(
    doctype,
    filters=None,
    fields=None,
    order_by=None,
    limit=None,
    pluck=None,
    as_list=False,
    or_filters=None,
    group_by=None,
    limit_start=0,
    limit_page_length=None,
    page_length=None,
    start=None,
    distinct=False,
    ignore_permissions=False,
    user=None,
    **kwargs,
):
    from apps.frappe.model.db_query import run_query

    if limit is None:
        limit = limit_page_length if limit_page_length is not None else page_length
    if limit is None:
        limit = 20
    return run_query(
        doctype,
        filters=filters,
        or_filters=or_filters,
        fields=fields,
        order_by=order_by,
        group_by=group_by,
        limit=int(limit) or None,
        limit_start=start if start is not None else limit_start,
        pluck=pluck,
        as_list=as_list,
        distinct=distinct,
        ignore_permissions=ignore_permissions,
        user=user,
    )


def get_all(doctype, *args, **kwargs):
    kwargs["ignore_permissions"] = True
    if kwargs.get("limit") is None and kwargs.get("limit_page_length") is None and kwargs.get("page_length") is None:
        kwargs["limit"] = 0
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
    from apps.core.doctype.docshare.docshare import DocShare
    from apps.frappe.models import DocPerm, HasRole, Role, Series, Singles, UserPermission

    return {
        "DocPerm": DocPerm,
        "DocShare": DocShare,
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
        return int(default) if str(default or 0).lstrip("-").isdigit() else 0
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


class Database:
    db_type = "postgres"

    db_type = "postgres"

    def get_single_value(self, doctype, fieldname, cache=False):
        from apps.erpnext.registry import get_meta
        from apps.frappe.models import Singles

        raw = Singles.objects.filter(doctype=doctype, field=fieldname).values_list("value", flat=True).first()
        field = next((f for f in _meta_fields(doctype) if f.get("fieldname") == fieldname), None)
        if raw is None:
            return _single_default(field)
        return _cast_single(field, raw)

    def set_single_value(self, doctype, fieldname, value=None, *args, **kwargs):
        from apps.frappe.models import Singles

        values = dict(fieldname) if isinstance(fieldname, dict) else {fieldname: value}
        for key, val in values.items():
            if val is None:
                Singles.objects.filter(doctype=doctype, field=key).delete()
                continue
            stored = "1" if val is True else "0" if val is False else str(val)
            Singles.objects.update_or_create(doctype=doctype, field=key, defaults={"value": stored})

    def get_singles_dict(self, doctype, debug=False, *, for_update=False):
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
        query = query.replace("`", '"').replace("ifnull(", "coalesce(").replace("IFNULL(", "coalesce(")
        if values is None and "%%" in query:
            query = query.replace("%%", "%")
        with connection.cursor() as cursor:
            cursor.execute(query, values)
            if cursor.description is None:
                return []
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
        if kwargs.get("pluck"):
            return [row[0] for row in rows]
        if as_dict or kwargs.get("as_dict"):
            return [_dict(zip(columns, row)) for row in rows]
        if as_list:
            return [list(row) for row in rows]
        return rows

    def get_defaults(self, key=None, parent="__default"):
        from apps.frappe.defaults import get_defaults_for

        if key:
            return self.get_default(key, parent)
        return get_defaults_for(parent)

    def get_value(
        self,
        doctype,
        filters=None,
        fieldname="name",
        ignore=None,
        as_dict=False,
        debug=False,
        order_by="KEEP_DEFAULT_ORDERING",
        cache=False,
        for_update=False,
        wait=True,
        *,
        run=True,
        pluck=False,
        distinct=False,
        skip_locked=False,
        parent=None,
    ):
        from django.db.utils import OperationalError

        from apps.frappe.exceptions import QueryTimeoutError
        from apps.frappe.model.db_query import run_query

        if isinstance(filters, (int, float)) or (isinstance(filters, str) and filters != doctype):
            filters = {"name": filters}
        elif filters is None or filters == doctype:
            if get_meta_issingle(doctype):
                return self.get_single_value(doctype, fieldname if isinstance(fieldname, str) else fieldname[0])
            filters = {}

        from apps.frappe.model.db_query import normalize_field_spec

        multiple = isinstance(fieldname, (list, tuple))
        fields = [normalize_field_spec(f) for f in (list(fieldname) if multiple else [fieldname])]
        if pluck:
            as_dict = False
        order = None if order_by in (None, "KEEP_DEFAULT_ORDERING") else order_by
        try:
            if for_update:
                model = resolve_model(doctype)
                qs = apply_filters(model.objects.all(), filters)
                qs = qs.select_for_update(nowait=not wait, skip_locked=skip_locked)
                if order:
                    from apps.frappe.model.db_query import apply_order_by

                    qs = apply_order_by(qs, order)
                rows = list(qs.values(*fields)[:1])
                rows = [_dict(row) for row in rows]
            else:
                rows = run_query(
                    doctype,
                    filters=filters,
                    fields=fields,
                    order_by=order or ("modified desc" if "modified" in [f.name for f in resolve_model(doctype)._meta.fields] else None),
                    limit=1,
                    ignore_permissions=True,
                    distinct=distinct,
                )
        except OperationalError as exc:
            raise QueryTimeoutError(str(exc)) from exc
        if not rows:
            return None
        row = rows[0]
        if as_dict:
            return _dict(row)
        if multiple and len(fields) > 1:
            return tuple(row.get(f.split(" as ")[-1].strip()) for f in fields)
        return row.get(fields[0].split(" as ")[-1].strip())

    def get_values(
        self,
        doctype,
        filters=None,
        fieldname="name",
        ignore=None,
        as_dict=False,
        debug=False,
        order_by="KEEP_DEFAULT_ORDERING",
        update=None,
        cache=False,
        for_update=False,
        run=True,
        pluck=False,
        distinct=False,
        limit=None,
        skip_locked=False,
        wait=True,
    ):
        from apps.frappe.model.db_query import run_query

        if isinstance(filters, (str, int, float)):
            filters = {"name": filters}
        multiple = isinstance(fieldname, (list, tuple))
        fields = list(fieldname) if multiple else [fieldname]
        order = None if order_by in (None, "KEEP_DEFAULT_ORDERING") else order_by
        rows = run_query(
            doctype,
            filters=filters or {},
            fields=fields,
            order_by=order,
            limit=limit,
            pluck=fields[0] if pluck else None,
            ignore_permissions=True,
            distinct=distinct,
        )
        if pluck:
            return rows
        if as_dict:
            return [_dict(row) for row in rows]
        keys = [f.split(" as ")[-1].strip() for f in fields]
        return [tuple(row.get(key) for key in keys) for row in rows]

    def set_value(self, doctype, name, fieldname, value=None, update_modified=True, **kwargs):
        model = resolve_model(doctype)
        values = dict(fieldname) if isinstance(fieldname, dict) else {fieldname: value}
        if isinstance(name, dict):
            qs = apply_filters(model.objects.all(), name)
        else:
            qs = model.objects.filter(pk=name)
        qs.update(**values)
        return values

    def get_default(self, key, parent="__default"):
        from apps.frappe.defaults import get_defaults_for

        value = get_defaults_for(parent).get(key)
        if isinstance(value, (list, tuple)):
            return value[0] if value else None
        return value

    def set_default(self, key, value, parent="__default", parenttype=None):
        from apps.frappe.defaults import set_default

        set_default(key, value, parent, parenttype or "__default")

    auto_commit_on_many_writes = False
    MAX_WRITES_PER_TRANSACTION = 200_000
    last_query = None
    value_cache = {}

    class TableMissingError(Exception):
        pass

    def get_singles_value(self, *args, **kwargs):
        return self.get_single_value(*args, **kwargs)

    def a_row_exists(self, doctype):
        return resolve_model(doctype).objects.exists()

    def has_table(self, doctype):
        return self.table_exists(doctype)

    def field_exists(self, doctype, fieldname):
        return self.has_column(doctype, fieldname)

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
        name = constraint_name or ("unique_" + "_".join(columns))[:60]
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
        return self.sql(sql_dict.get("postgres") or sql_dict.get("standard"), values, **kwargs)

    def is_unique_key_violation(self, exc):
        return self.is_duplicate_entry(exc)

    def get_column_type(self, doctype, column):
        field = resolve_model(doctype)._meta.get_field(column)
        return field.db_type(connection)

    def change_column_type(self, doctype, column, type, nullable=False):
        table = resolve_model(doctype)._meta.db_table
        with connection.cursor() as cursor:
            cursor.execute(f'ALTER TABLE "{table}" ALTER COLUMN "{column}" TYPE {type} USING "{column}"::{type}')

    def get_descendants(self, doctype, name):
        from apps.frappe.utils.nestedset import get_descendants_of

        return get_descendants_of(doctype, name, ignore_permissions=True)

    def bulk_update(self, doctype, doc_updates, *, chunk_size=100, modified=None, modified_by=None, update_modified=True, debug=False):
        model = resolve_model(doctype)
        stamp = {}
        if update_modified:
            from django.utils import timezone

            stamp = {"modified": modified or timezone.now(), "modified_by": modified_by or session.user}
        for name, values in doc_updates.items():
            model.objects.filter(pk=name).update(**values, **stamp)

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

    def get_all(self, *args, **kwargs):
        return get_all(*args, **kwargs)

    def get_list(self, *args, **kwargs):
        kwargs["ignore_permissions"] = True
        return get_list(*args, **kwargs)

    def table_exists(self, doctype, cached=True):
        try:
            resolve_model(doctype)
        except LookupError:
            return False
        return True

    def add_index(self, doctype, fields, index_name=None):
        model = resolve_model(doctype)
        table = model._meta.db_table
        columns = [f.split("(")[0] for f in fields]
        name = index_name or ("idx_" + "_".join(columns))[:60]
        quoted = ", ".join(f'"{column}"' for column in columns)
        with connection.cursor() as cursor:
            cursor.execute(f'CREATE INDEX IF NOT EXISTS "{name}_{abs(hash(table)) % 10000}" ON "{table}" ({quoted})')

    def truncate(self, doctype):
        resolve_model(doctype).objects.all().delete()

    def bulk_insert(self, doctype, fields, values, ignore_duplicates=False, *, chunk_size=10_000):
        model = resolve_model(doctype)
        objects = [model(**dict(zip(fields, row))) for row in values]
        model.objects.bulk_create(objects, ignore_conflicts=ignore_duplicates, batch_size=chunk_size)

    def updatedb(self, doctype, meta=None):
        from apps.erpnext.registry import get_model

        get_model(doctype)

    def get_table_columns(self, doctype):
        return [field.column for field in resolve_model(doctype)._meta.fields]

    def has_column(self, doctype, column):
        return column in {field.name for field in resolve_model(doctype)._meta.fields}

    def exists(self, doctype, name=None, filters=None, cache=False, **kwargs):
        qs = resolve_model(doctype).objects.all()
        if isinstance(name, (dict, list, tuple)):
            filters, name = name, None
        if name is not None and name != "":
            if doctype == "User" and isinstance(name, str) and not name.isdigit():
                qs = qs.filter(email=name)
            else:
                qs = qs.filter(pk=name)
        elif filters:
            qs = apply_filters(qs, filters)
        elif name is None and filters is None:
            return None
        match_field = "email" if doctype == "User" else "pk"
        match = qs.values_list(match_field, flat=True).first()
        return match

    def count(self, doctype=None, filters=None, dt=None, **kwargs):
        doctype = doctype or dt
        return apply_filters(resolve_model(doctype).objects.all(), filters).count()

    def delete(self, doctype, filters=None):
        return apply_filters(resolve_model(doctype).objects.all(), filters).delete()

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

    def is_missing_table_or_column(self, exc):
        return self.is_missing_column(exc) or self.is_table_missing(exc)

    def is_duplicate_entry(self, exc):
        current = exc
        for _ in range(6):
            if current is None:
                return False
            if getattr(current, "pgcode", None) == "23505" or getattr(current, "sqlstate", None) == "23505":
                return True
            current = getattr(current, "__cause__", None)
        return False

    def set_next_sequence_val(self, doctype_name, next_val, is_val_used=False, slug="_id_seq"):
        sequence_name = scrub(f"{doctype_name}{slug}")
        used = "true" if is_val_used else "false"
        self.sql(f"SELECT SETVAL('\"{sequence_name}\"', {int(next_val)}, {used})")

    def sql_ddl(self, query):
        with connection.cursor() as cursor:
            cursor.execute(query)

    def commit(self):
        transaction.commit()

    def rollback(self, save_point=None):
        if save_point:
            with connection.cursor() as cursor:
                cursor.execute(f'ROLLBACK TO SAVEPOINT "{save_point}"')
            connection.needs_rollback = False
            return
        transaction.rollback()

    def savepoint(self, name):
        with connection.cursor() as cursor:
            cursor.execute(f'SAVEPOINT "{name}"')

    def release_savepoint(self, name):
        with connection.cursor() as cursor:
            cursor.execute(f'RELEASE SAVEPOINT "{name}"')


db = Database()
