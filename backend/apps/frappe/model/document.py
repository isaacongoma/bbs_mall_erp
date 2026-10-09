from __future__ import annotations
from typing import TYPE_CHECKING, Any, ClassVar, Literal, Optional, Self, TypeAlias, Union, overload, override
from frappe.model.base_document import BaseDocument, D, get_controller
from apps.frappe.model import display_fieldtypes, get_permitted_fields
from apps.frappe.model.dynamic_links import invalidate_distinct_link_doctypes
from apps.frappe.model.utils.link_count import notify_link_count
from apps.frappe.utils import is_a_property
from apps.frappe.utils.data import strip_html
from apps.frappe.utils.html_utils import has_html_tags, sanitize_html, unescape_html
from collections.abc import Callable, Generator, Iterable
from frappe.model.utils import is_virtual_doctype, simple_singledispatch
import functools
from collections.abc import Callable
from werkzeug.exceptions import NotFound
from frappe import _, is_whitelisted, msgprint
from frappe.database.utils import commit_after_response
from frappe.model import optional_fields, table_fields
from frappe.model.naming import set_new_name, validate_name
from frappe.model.workflow import set_workflow_state_on_action, validate_workflow
from frappe.utils import cint, compare, cstr, date_diff, file_lock, flt, get_table_name, now
from frappe.utils.data import get_absolute_url, get_datetime, get_timedelta, getdate

from django.db import transaction
from django.utils.module_loading import import_string
from django.utils import timezone

from apps.frappe.model.docstatus import DocStatus
from apps.frappe.model.naming import set_new_name
from apps.frappe import exceptions
import copy
from functools import cached_property
import datetime
import decimal
import hashlib
import itertools
import json
import time
import weakref

import frappe
from apps.frappe.utils.defaults import get_not_null_defaults
from apps.frappe.model.base_document import RESERVED_KEYWORDS
import inspect
from apps.frappe.model import datetime_fields, float_like_fields
from apps.frappe.runtime import _, _dict, msgprint, throw
from apps.frappe.automation_engine.dispatch import run_automations
from apps.frappe.core.doctype.server_script.server_script_utils import run_server_script_for_doc_event
from apps.frappe.integrations.doctype.webhook import run_webhooks
from apps.frappe.utils.global_search import update_global_search
from apps.frappe.utils.data import cast_fieldtype
from apps.frappe.utils.data import compare
from apps.frappe.utils.data import cint, cstr, flt, getdate, today

TABLE_DOCTYPES_FOR_DOCTYPE = {
    "fields": "DocField",
    "permissions": "DocPerm",
    "actions": "DocType Action",
    "links": "DocType Link",
    "states": "DocType State",
}
TABLE_DOCTYPES_FOR_CHILD_TABLES = {}
DOCTYPES_FOR_DOCTYPE = {"DocType", *TABLE_DOCTYPES_FOR_DOCTYPE.values()}
DOCUMENT_LOCK_EXPIRY = 60 * 60
DOCUMENT_LOCK_SOFT_EXPIRY = 60 * 10
DatetimeTypes = datetime.date | datetime.datetime | datetime.time | datetime.timedelta


def _db_field_value(field, value):
    if getattr(field, "is_relation", False) and getattr(field, "related_model", None) and getattr(field.related_model._meta, "model_name", "") == "user":
        if isinstance(value, str) and not value.isdigit():
            return field.related_model.objects.filter(email=value).first()
    if value is None and field.empty_strings_allowed and not getattr(field, "null", False):
        return ""
    if value is None and not getattr(field, "null", True) and hasattr(field, "has_default") and field.has_default():
        return field.get_default()
    if isinstance(value, str) and value == "" and not field.empty_strings_allowed:
        return None
    return value


def _comparable(df, value):
    if value is None or value == "":
        return None
    fieldtype = df.get("fieldtype") if df else None
    try:
        if fieldtype == "Date":
            return getdate(value)
        if fieldtype == "Datetime":
            from apps.frappe.utils.data import get_datetime

            return _as_naive(get_datetime(value))
        if fieldtype == "Time":
            from apps.frappe.utils.data import to_timedelta

            return to_timedelta(value)
        if fieldtype in ("Float", "Currency", "Percent"):
            return flt(value)
        if fieldtype in ("Int", "Check"):
            return cint(value)
    except Exception:
        return value
    return value


def _as_naive(value):
    if isinstance(value, datetime.datetime) and value.tzinfo is not None:
        from django.utils import timezone

        return timezone.make_naive(value, timezone.get_default_timezone())
    return value


DYNAMIC_DEFAULTS = ("Today", "Now", "__user")
NO_VALUE_FIELDTYPES = {"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold", "Image"}


_POSITIONAL_PARAM_KINDS = frozenset((inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD))


@functools.cache
def _accepts_method_argument(f: Callable) -> bool:
    signature = inspect.signature(f)
    kinds = [p.kind for p in signature.parameters.values()]
    if any(kind == inspect.Parameter.VAR_POSITIONAL for kind in kinds):
        return True

    if sum(1 for kind in kinds if kind in _POSITIONAL_PARAM_KINDS) > 1:
        return True

    return False


max_positive_value = {"smallint": 2**15 - 1, "int": 2**31 - 1, "bigint": 2**63 - 1}


_NOT_IN_CACHE = object()


def _fetch_link_values(doctype: str, docname: str, fields: tuple, meta) -> dict | None:
    """Fetch link field values from database with fallback logic.

    This helper encapsulates the repeated DB query pattern:
    1. Try get_value with cache=True
    2. If not found, retry without cache (handles negative caching)
    3. For virtual doctypes, use frappe.get_doc instead

    Args:
        doctype: Target DocType
        docname: Document name to fetch
        fields: Tuple of field names to fetch
        meta: Meta object for the doctype

    Returns:
        Dict of field values or None if document doesn't exist
    """
    if not meta.get("is_virtual"):
        values = frappe.db.get_value(doctype, docname, fields, as_dict=True, cache=True, order_by=None)
        if not values:
            values = frappe.db.get_value(doctype, docname, fields, as_dict=True, order_by=None)
    else:
        try:
            values = frappe.get_doc(doctype, docname).as_dict()
        except frappe.DoesNotExistError:
            values = None
    return values


class Document:
    doctype: str

    def __init__(self, data=None, **kwargs):
        values = {}
        values.update(data or {})
        values.update(kwargs)
        self.doctype = values.pop("doctype", getattr(self, "doctype", self.__class__.__name__))
        from apps.frappe.runtime import _dict

        raw_flags = values.pop("flags", None) or {}
        self.flags = raw_flags if isinstance(raw_flags, _dict) else _dict(raw_flags)
        self._doc_before_save = None
        self.dont_update_if_missing = []
        self.name = None
        self.owner = ""
        self.modified_by = ""
        self.docstatus = 0
        self.idx = 0
        self.apply_defaults()
        for key in ("creation", "modified"):
            self.__dict__.setdefault(key, None)
        for key, value in values.items():
            attribute = getattr(type(self), key, None)
            if isinstance(attribute, property) and attribute.fset is None:
                continue
            if isinstance(value, list) and value and isinstance(value[0], dict):
                from apps.frappe.runtime import get_doc
                from apps.erpnext.registry import get_meta
                child_docs = []
                for v in value:
                    if "doctype" not in v:
                        for field in get_meta(self.doctype).get("fields", []):
                            if field.get("fieldname") == key:
                                v["doctype"] = field.get("options")
                                break
                    if "doctype" in v:
                        child_docs.append(get_doc(v))
                    else:
                        child_docs.append(v)
                setattr(self, key, child_docs)
            elif value is None and isinstance(self.__dict__.get(key), list):
                continue
            else:
                setattr(self, key, value)
        setattr(self, "__islocal", bool(values["__islocal"]) if "__islocal" in values else not bool(getattr(self, "name", None)))
        if hasattr(self, "__setup__"):
            self.__setup__()


    def is_new(self):
        return bool(self.__dict__.get("__islocal"))

    def __json__(self):
        return self.as_dict(no_nulls=True)

    def as_dict(self, no_nulls=False, no_default_fields=False, convert_dates_to_str=False, no_child_table_fields=False, no_private_properties=False):
        import datetime
        import decimal

        from apps.frappe.runtime import _dict

        default_fields = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"}
        child_fields = {"parent", "parentfield", "parenttype"}
        out = _dict()
        private_properties = ("_user_tags", "__islocal", "__onload", "_liked_by", "__run_link_triggers", "__unsaved")
        for key, value in self.__dict__.items():
            if key in private_properties:
                if no_private_properties or not value:
                    continue
            elif key in ("flags", "dont_update_if_missing") or key.startswith("_"):
                continue
            if no_default_fields and key in default_fields:
                continue
            if no_child_table_fields and key in child_fields:
                continue
            if no_nulls and value is None:
                continue
            if isinstance(value, list):
                value = [item.as_dict(no_nulls=no_nulls, no_default_fields=no_default_fields, convert_dates_to_str=convert_dates_to_str, no_child_table_fields=no_child_table_fields, no_private_properties=no_private_properties) if isinstance(item, Document) else item for item in value]
            elif convert_dates_to_str and isinstance(value, (datetime.datetime, datetime.date, datetime.time, datetime.timedelta)):
                value = str(value)
            elif convert_dates_to_str and isinstance(value, decimal.Decimal):
                value = float(value)
            out[key] = value
        return out

    def update(self, d):
        from apps.erpnext.registry import get_meta

        table_fields = {
            field["fieldname"]
            for field in get_meta(self.doctype).get("fields", [])
            if field.get("fieldtype") in {"Table", "Table MultiSelect"}
        }
        for key, value in dict(d).items():
            if key in {"doctype", "flags"}:
                continue
            if key in table_fields and isinstance(value, (list, tuple)):
                setattr(self, key, [])
                for row in value:
                    self.append(key, row)
                continue
            setattr(self, key, value)
        return self

    def getone(self, filters):
        for rows in self.__dict__.values():
            if isinstance(rows, list):
                for row in rows:
                    if isinstance(row, Document) and all(getattr(row, k, None) == v for k, v in dict(filters).items()):
                        return row
        return None


    def get(self, key=None, filters=None, limit=None, default=None):
        if isinstance(key, dict):
            return self._get_rows_by_filters(key, filters, limit)
        value = getattr(self, key, None) if isinstance(key, str) else None
        if key not in self.__dict__ and inspect.ismethod(value):
            value = None
        if isinstance(value, list) and isinstance(filters, (dict, list, tuple)):
            from apps.frappe.runtime import _row_matches

            rows = [row for row in value if _row_matches(row.__dict__ if hasattr(row, "__dict__") else row, filters)]
            return rows[:limit] if limit else rows
        if value is None:
            if filters is not None and not isinstance(filters, (dict, list, tuple)):
                return filters
            return default
        return value

    def _get_rows_by_filters(self, filters, extra, limit):
        return []


    def _is_table_key(self, key):
        try:
            df = self.meta.get_field(key)
        except Exception:
            return False
        return bool(df and df.fieldtype in ("Table", "Table MultiSelect"))

    def append(self, key, value=None):
        from apps.erpnext.registry import get_meta
        rows = getattr(self, key, None)
        if rows is None:
            rows = []
            setattr(self, key, rows)
        child_doctype = None
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("fieldname") == key and field.get("fieldtype") in {"Table", "Table MultiSelect"}:
                child_doctype = field.get("options")
                break
        if isinstance(value, Document):
            row = value
        else:
            from apps.frappe.runtime import get_doc as _get_doc

            row = _get_doc({"doctype": child_doctype, **(value or {})}, ignore_permissions=True)
        rows.append(row)
        row.parent = getattr(self, "name", None)
        row.parenttype = self.doctype
        row.parentfield = key
        row.idx = len(rows)
        return row

    def run_method(self, method: str, *args, **kwargs):
        if method.startswith("_"):
            raise Exception("Run method is for hooks, avoid usage on internal methods")

        def fn(self, *args, **kwargs):
            method_object = getattr(self, method, None)

            if method in self.__dict__ or callable(method_object):
                return method_object(*args, **kwargs)

        fn.__name__ = str(method)
        out = Document.hook(fn)(self, *args, **kwargs)

        self.run_notifications(method)
        run_webhooks(self, method)
        run_server_script_for_doc_event(self, method)
        run_automations(self, method)

        return out

    def get_doc_event_handlers(self, method):
        from apps.frappe.runtime import get_doc_hooks, resolve_hook_handler

        hooks = get_doc_hooks()
        handlers = []
        for event_map in (hooks.get(self.doctype, {}), hooks.get("*", {})):
            value = event_map.get(method, []) if event_map else []
            if isinstance(value, (str, bytes)) or callable(value):
                value = [value]
            handlers.extend(value or [])
        resolved = []
        for handler in handlers:
            if isinstance(handler, str):
                handler = resolve_hook_handler(handler)
                if handler is None:
                    continue
            resolved.append(handler)
        return resolved

    def _fix_numeric_types(self):
        for df in self.meta.get("fields"):
            if df.fieldtype == "Check":
                self.set(df.fieldname, cint(self.get(df.fieldname)))
            elif self.get(df.fieldname) is not None:
                if df.fieldtype == "Int":
                    self.set(df.fieldname, cint(self.get(df.fieldname)))
                elif df.fieldtype in ("Float", "Currency", "Percent"):
                    self.set(df.fieldname, flt(self.get(df.fieldname)))

    def apply_defaults(self):
        from apps.erpnext.registry import get_meta
        meta = get_meta(self.doctype)
        fields = [
            field
            for field in meta.get("fields", [])
            if not isinstance(getattr(type(self), field.get("fieldname") or "", None), property)
        ]
        for field in fields:
            if field.get("fieldtype") in {"Table", "Table MultiSelect"}:
                setattr(self, field["fieldname"], [])
                continue
            default = field.get("default")
            if default is None:
                if field.get("fieldtype") == "Check":
                    default = 0
                elif (
                    field.get("fieldtype") == "Select"
                    and field.get("options")
                    and field.get("options") not in ("[Select]", "Loading...")
                    and field.get("fieldname") != "naming_series"
                ):
                    default = field["options"].split(chr(10), 1)[0]
                    if not default:
                        continue
                else:
                    continue
            if field.get("fieldtype") in ("Check", "Int"):
                default = cint(default)
            elif field.get("fieldtype") in ("Float", "Currency", "Percent"):
                default = flt(default)
            if default in DYNAMIC_DEFAULTS or (isinstance(default, str) and default.startswith(":")):
                continue
            setattr(self, field["fieldname"], default)
        for field in fields:
            fieldname = field.get("fieldname")
            if fieldname and field.get("fieldtype") not in NO_VALUE_FIELDTYPES and fieldname not in self.__dict__:
                setattr(self, fieldname, None)

    def _set_defaults(self):
        if frappe.flags.in_import:
            return

        if self.is_new():
            new_doc = frappe.new_doc(self.doctype, as_dict=True)
            self.update_if_missing(new_doc)

        for df in self.meta.get_table_fields():
            new_doc = frappe.new_doc(df.options, parent_doc=self, parentfield=df.fieldname, as_dict=True)
            value = self.get(df.fieldname)
            if isinstance(value, list):
                for d in value:
                    if Document.is_new(d):
                        d.update_if_missing(new_doc)

    def apply_dynamic_defaults(self):
        from apps.erpnext.registry import get_meta
        from apps.frappe.runtime import session
        from apps.frappe.utils import now, nowtime, today

        for field in get_meta(self.doctype).get("fields", []):
            default = field.get("default")
            fieldname = field.get("fieldname")
            if default not in DYNAMIC_DEFAULTS or not fieldname or self.__dict__.get(fieldname) not in (None, ""):
                continue
            if default == "Today":
                setattr(self, fieldname, today())
            elif default == "Now":
                setattr(self, fieldname, nowtime() if field.get("fieldtype") == "Time" else now())
            elif default == "__user":
                setattr(self, fieldname, session.user)
        return self

    def insert(
        self,
        ignore_permissions=None,
        ignore_links=None,
        ignore_if_duplicate=False,
        ignore_mandatory=None,
        set_name=None,
        set_child_names=True,
    ):
        if ignore_permissions is not None:
            self.flags["ignore_permissions"] = ignore_permissions
        if ignore_links is not None:
            self.flags["ignore_links"] = ignore_links
        if ignore_mandatory is not None:
            self.flags["ignore_mandatory"] = ignore_mandatory
        self._doc_before_save = None
        self.check_permission("create")
        if cint(self.get("docstatus")) == 2:
            raise exceptions.DocstatusTransitionError("Cannot change docstatus from 0 (Draft) to 2 (Cancelled)")
        self.set_user_and_timestamp()
        self.set_docstatus()
        self._set_defaults()
        self.apply_dynamic_defaults()
        for child in self.get_all_children():
            child.apply_dynamic_defaults()
        submitting = getattr(self, "docstatus", 0) == 1
        if submitting:
            self._action = "submit"
        else:
            self._action = "save"
        self._validate_links()
        self.run_method("before_insert")
        self.set_new_name(set_name=set_name, set_child_names=set_child_names)
        self.set_parent_in_children()
        self.validate_higher_perm_levels()

        self.set_fetch_from_values(skip_submitted=False)
        self.flags["in_insert"] = True
        self.run_before_save_methods()
        self._validate()
        self.set_docstatus()
        self.db_insert(ignore_if_duplicate=ignore_if_duplicate)
        setattr(self, "__islocal", False)
        insert_action = self._action
        self.run_method("after_insert")
        self._action = insert_action
        if self.get("amended_from"):
            self.validate_amended_from()
            self.copy_attachments_from_amended_from()
        self.run_post_save_methods()
        self.flags["in_insert"] = False
        if submitting:
            delattr(self, "_action")
        return self

    def save(self, ignore_permissions=None, ignore_version=None):
        from apps.frappe.runtime import flags as frappe_flags

        marker = (self.doctype, getattr(self, "name", None))
        saving = frappe_flags.currently_saving
        if saving is None:
            saving = frappe_flags.currently_saving = []
        saving.append(marker)
        try:
            return self._save(ignore_permissions, ignore_version)
        finally:
            if marker in saving:
                saving.remove(marker)

    def _save(self, ignore_permissions=None, ignore_version=None):
        if ignore_permissions is not None:
            self.flags["ignore_permissions"] = ignore_permissions
        if ignore_version is not None:
            self.flags["ignore_version"] = ignore_version
        if self._doctype_is_single():
            self.name = self.doctype
        if not getattr(self, "name", None):
            return self.insert(ignore_permissions=ignore_permissions)
        if not self._doctype_is_single() and not self._doc_qs().exists():
            if hasattr(self, "_action"):
                delattr(self, "_action")
            return self.insert(ignore_permissions=ignore_permissions)

        original_modified = getattr(self, "modified", None)
        original_modified_by = getattr(self, "modified_by", None)
        persisted = False
        try:
            self.load_doc_before_save()

            if not hasattr(self, "_action"):
                if getattr(self, "docstatus", 0) == 1 and getattr(self._doc_before_save, "docstatus", 0) == 1:
                    self._action = "update_after_submit"
                else:
                    self._action = "save"

            if self._action == "submit":
                self.check_docstatus_transition(1)
                if self._action == "submit":
                    self.check_permission("submit")
                else:
                    self.check_permission("write")
            elif self._action == "cancel":
                self.check_permission("cancel")
                self.check_docstatus_transition(2)
            else:
                self.check_permission("write")

            self.check_if_latest()
            self.set_user_and_timestamp()
            self.set_docstatus()

            if self._action == "update_after_submit":
                self.validate_update_after_submit()

            self.set_parent_in_children()
            self.validate_higher_perm_levels()
            self._validate_links()

            self.set_fetch_from_values()
            self.validate_set_only_once()
            self.run_before_save_methods()
            if self._action != "cancel":
                self._validate()

            self.db_update()
            persisted = True

            self.run_post_save_methods()
            self._sync_modified_from_db()

            if hasattr(self, "_action"):
                delattr(self, "_action")

            return self
        except Exception:
            if not persisted:
                self.modified = original_modified
                self.modified_by = original_modified_by
            raise

    def run_before_save_methods(self):
        self.reset_seen()

        if self._action in ("save", "submit"):
            self.run_method("before_validate")

        if self.flags.ignore_validate:
            return

        if self._action == "save":
            self.run_method("validate")
            self.run_method("before_save")
        elif self._action == "submit":
            self.run_method("validate")
            self.run_method("before_submit")
        elif self._action == "cancel":
            self.run_method("before_cancel")
        elif self._action == "update_after_submit":
            self.run_method("before_update_after_submit")

        self.set_title_field()

    def run_post_save_methods(self):
        if self._action == "save":
            self.run_method("on_update")
        elif self._action == "submit":
            self.run_method("on_update")
            self.run_method("on_submit")
        elif self._action == "cancel":
            self.run_method("on_cancel")
            self.check_no_back_links_exist()
        elif self._action == "update_after_submit":
            self.run_method("on_update_after_submit")

        if not (frappe.flags.in_import and self.is_new()):
            self.clear_cache()

        if self.flags.get("notify_update", True):
            self.notify_update()

        update_global_search(self)

        self.save_version()

        self.run_method("on_change")

        if (self.doctype, self.name) in frappe.flags.currently_saving:
            frappe.flags.currently_saving.remove((self.doctype, self.name))

    def submit(self):
        return self._submit()

    def _submit(self):
        from apps.erpnext.registry import get_meta
        if not get_meta(self.doctype).get("is_submittable"):
            from apps.frappe import exceptions
            raise exceptions.ValidationError(f"{self.doctype} is not submittable")
        self._action = "submit"
        self.docstatus = 1
        from django.db import transaction

        with transaction.atomic():
            self.save()
        return self

    def cancel(self):
        return self._cancel()

    def _cancel(self):
        from apps.erpnext.registry import get_meta
        if not get_meta(self.doctype).get("is_submittable"):
            from apps.frappe import exceptions
            raise exceptions.ValidationError(f"{self.doctype} is not submittable")
        self._action = "cancel"
        self.docstatus = 2
        from django.db import transaction

        with transaction.atomic():
            self.save()
        return self

    def delete(self, ignore_permissions=False, force=False, *, delete_permanently=False, ignore_on_trash=False):
        from apps.frappe.model.delete_doc import delete_doc

        if ignore_permissions:
            self.flags.ignore_permissions = ignore_permissions
        return delete_doc(
            self.doctype,
            self.name,
            ignore_permissions=ignore_permissions,
            flags=self.flags,
            force=force,
            delete_permanently=delete_permanently,
            ignore_on_trash=ignore_on_trash,
        )

    def rename(self, name, merge=False, force=False, validate_rename=True):
        from apps.frappe.model.rename_doc import rename_doc

        new_name = rename_doc(doc=self, new=name, merge=merge, force=force, validate=validate_rename)
        self.name = new_name
        return new_name


    def clear_cache(self):
        return None


    def as_json(self):
        from apps.frappe.runtime import as_json

        return as_json(self.as_dict())

    @property
    def meta(self):
        from apps.frappe.runtime import get_meta

        return get_meta(self.doctype)

    @property
    def docstatus(self):
        value = self.__dict__.get("docstatus")
        if not isinstance(value, DocStatus):
            value = DocStatus(value or 0)
            self.__dict__["docstatus"] = value
        return value

    @docstatus.setter
    def docstatus(self, value):
        if not isinstance(value, DocStatus):
            value = DocStatus(value or 0)
        self.__dict__["docstatus"] = value

    def reload(self):
        from apps.frappe.runtime import get_doc
        self.check_permission("read")
        loaded = get_doc(self.doctype, self.name)
        self.__dict__.update(loaded.__dict__)
        return self

    def load_from_db(self):
        return self.reload()

    def copy_doc(self, ignore_no_copy=True):
        import copy
        from apps.frappe.runtime import get_doc
        data = copy.deepcopy(self.as_dict())
        newdoc = get_doc(data)
        fields_to_clear = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "amended_from", "amendment_date"]
        for fieldname in fields_to_clear:
            newdoc.set(fieldname, None)
        newdoc.docstatus = 0

        from apps.erpnext.registry import get_meta
        if not ignore_no_copy:
            meta = get_meta(newdoc.doctype)
            for df in meta.get("fields", []):
                if df.get("no_copy"):
                    newdoc.set(df["fieldname"], None)

        for df in get_meta(newdoc.doctype).get("fields", []):
            if df.get("fieldtype") in {"Table", "Table MultiSelect"}:
                for row in getattr(newdoc, df["fieldname"], []) or []:
                    for fieldname in fields_to_clear:
                        row.set(fieldname, None)
                    if not ignore_no_copy:
                        child_meta = get_meta(df["options"])
                        for child_df in child_meta.get("fields", []):
                            if child_df.get("no_copy"):
                                row.set(child_df["fieldname"], None)
        return newdoc

    def set_user_and_timestamp(self):
        from apps.frappe.runtime import session
        now = frappe.utils.now_datetime()
        user = getattr(session, "user", "Administrator") or "Administrator"
        if not getattr(self, "creation", None):
            self.creation = now
        if not getattr(self, "owner", None):
            self.owner = user
        self.modified = now
        self.modified_by = user


    def _doctype_is_single(self):
        from apps.erpnext.registry import get_meta

        return bool(get_meta(self.doctype).get("issingle"))

    def is_single(self):
        return self._doctype_is_single()

    def _doc_qs(self, model=None):
        if model is None:
            from apps.erpnext.registry import get_model
            model = get_model(self.doctype)
        from apps.frappe.model.utils.model_names import name_filter

        return model.objects.filter(**name_filter(model, self.name))

    def check_if_latest(self):
        if not getattr(self, "name", None) or not getattr(self, "modified", None) or self._doctype_is_single():
            return
        db_doc = self._doc_qs().only("modified").first()
        if db_doc and db_doc.modified and _as_naive(db_doc.modified) != _as_naive(frappe.utils.get_datetime(self.modified)):
            raise exceptions.TimestampMismatchError("Document {0} {1} has been modified since it was loaded".format(self.doctype, self.name))

    def check_docstatus_transition(self, to_status):
        if getattr(self, "_doc_before_save", None) is None:
            self._doc_before_save = self.get_doc_before_save()
        if getattr(self, "_doc_before_save", None) is None:
            raise exceptions.DocstatusTransitionError("Cannot transition docstatus of unsaved document")
        from_status = getattr(self._doc_before_save, "docstatus", 0)
        if to_status == 1 and from_status == 1:
            self._action = "update_after_submit"
            return
        if to_status == 1 and from_status != 0:
            raise exceptions.DocstatusTransitionError("Only draft documents can be submitted")
        if to_status == 2 and from_status != 1:
            raise exceptions.DocstatusTransitionError("Only submitted documents can be cancelled")

    def check_no_back_links_exist(self):
        from apps.frappe.model.delete_doc import check_if_doc_is_dynamically_linked, check_if_doc_is_linked

        if not self.flags.ignore_links:
            check_if_doc_is_linked(self, method="Cancel")
            check_if_doc_is_dynamically_linked(self, method="Cancel")

    def check_if_doc_is_linked(self, method="Delete"):
        from apps.frappe.model.delete_doc import check_if_doc_is_dynamically_linked, check_if_doc_is_linked

        if self.flags.ignore_links:
            return
        check_if_doc_is_linked(self, method=method)
        check_if_doc_is_dynamically_linked(self, method=method)

    def set_parent_in_children(self):
        from apps.erpnext.registry import get_meta
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("fieldtype") in {"Table", "Table MultiSelect"}:
                for i, row in enumerate(getattr(self, field["fieldname"], []) or [], start=1):
                    row.parent = getattr(self, "name", None)
                    row.parenttype = self.doctype
                    row.parentfield = field["fieldname"]
                    row.idx = i
                    row.docstatus = getattr(self, "docstatus", 0)


    def check_permission(self, ptype="read", permtype=None):
        if permtype:
            ptype = permtype
        if self.flags.get("ignore_permissions"):
            return
        from apps.frappe.permissions import has_permission, raise_permission_error
        if not has_permission(self.doctype, ptype, doc=self):
            raise_permission_error(self.doctype, ptype)


    def get_changed_fields(self):
        if getattr(self, "_doc_before_save", None) is None:
            return []
        from apps.erpnext.registry import get_model
        changed = []
        skip = {"modified", "modified_by", "creation"}
        for field in get_model(self.doctype)._meta.fields:
            if field.name in skip:
                continue
            if _comparable(self.meta.get_field(field.name), getattr(self, field.name, None)) != _comparable(
                self.meta.get_field(field.name), getattr(self._doc_before_save, field.name, None)
            ):
                changed.append(field.name)
        return changed


    def validate_update_after_submit(self):
        if self.flags.ignore_validate_update_after_submit:
            return

        self._validate_update_after_submit()
        for d in self.get_all_children():
            if d.is_new() and self.meta.get_field(d.parentfield).allow_on_submit:
                continue

            d._validate_update_after_submit()

    def _validate_update_after_submit(self):
        import datetime

        from apps.frappe.model import table_fields

        db_values = frappe.get_doc(self.doctype, self.name).as_dict()

        for key in self.as_dict():
            df = self.meta.get_field(key)
            db_value = db_values.get(key)

            if df and not df.allow_on_submit and not df.is_virtual and (self.get(key) or db_value):
                if df.fieldtype in table_fields:
                    self_value = len(self.get(key))
                    db_value = len(db_value)
                else:
                    self_value = self.get_value(key)
                if isinstance(self_value, datetime.timedelta) and isinstance(db_value, datetime.time):
                    db_value = datetime.timedelta(
                        hours=db_value.hour,
                        minutes=db_value.minute,
                        seconds=db_value.second,
                        microseconds=db_value.microsecond,
                    )
                if self_value != db_value:
                    frappe.throw(
                        _("{0} Not allowed to change {1} after submission from {2} to {3}").format(
                            f"Row #{self.idx}:" if self.get("parent") else "",
                            frappe.bold(_(df.label, context=df.parent)),
                            frappe.bold(db_value),
                            frappe.bold(self_value),
                        ),
                        frappe.UpdateAfterSubmitError,
                        title=_("Cannot Update After Submit"),
                    )

    def set_fetch_from_values(self, skip_submitted=True):
        from apps.erpnext.registry import get_meta, get_model
        meta = get_meta(self.doctype)
        fields = {field.get("fieldname"): field for field in meta.get("fields", [])}
        for field in meta.get("fields", []):
            fetch_from = field.get("fetch_from")
            if not fetch_from or "." not in fetch_from:
                continue
            if skip_submitted and getattr(self, "docstatus", 0) == 1 and not field.get("allow_on_submit"):
                continue
            if field.get("fetch_if_empty") and getattr(self, field["fieldname"], None) not in (None, ""):
                continue
            link_fieldname, source_fieldname = fetch_from.split(".", 1)
            link_value = getattr(self, link_fieldname, None)
            if link_value in (None, ""):
                continue
            link_field = fields.get(link_fieldname) or {}
            link_doctype = link_field.get("options")
            if not link_doctype:
                continue
            try:
                from apps.frappe.model.utils.model_names import name_filter

                linked_model = get_model(link_doctype)
                linked = linked_model.objects.get(**name_filter(linked_model, link_value))
            except Exception:
                continue
            setattr(self, field["fieldname"], getattr(linked, source_fieldname, None))


    def validate_mandatory(self):
        if self.flags.get("ignore_mandatory"):
            return
        from apps.erpnext.registry import get_meta
        missing = []
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("reqd") and field.get("fieldtype") not in {"Section Break", "Column Break", "Tab Break"}:
                value = getattr(self, field["fieldname"], None)
                if value in (None, ""):
                    missing.append(field.get("label") or field["fieldname"])
        if missing:
            raise exceptions.MandatoryError("Mandatory fields required in {0}: {1}".format(self.doctype, ", ".join(missing)))
        for table_field in [field for field in get_meta(self.doctype).get("fields", []) if field.get("fieldtype") in {"Table", "Table MultiSelect"}]:
            for index, row in enumerate(getattr(self, table_field["fieldname"], []) or [], start=1):
                try:
                    row.validate_mandatory()
                except Exception as exc:
                    raise exceptions.MandatoryError("Row #{0}: {1}".format(index, exc)) from exc

    def validate_selects(self):
        from apps.erpnext.registry import get_meta
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("fieldtype") != "Select" or not field.get("options"):
                continue
            if field.get("fieldname") == "naming_series":
                continue
            value = getattr(self, field["fieldname"], None)
            if value in (None, ""):
                continue
            value = cstr(value).strip()
            setattr(self, field["fieldname"], value)
            options = [item for item in field.get("options", "").split("\n") if item]
            if options and value not in options:
                raise exceptions.ValidationError("{0} cannot be {1}".format(field.get("label") or field["fieldname"], value))

    def validate_links(self):
        from apps.erpnext.registry import get_meta, get_model
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("fieldtype") != "Link" or not field.get("options"):
                continue
            value = getattr(self, field["fieldname"], None)
            if value in (None, ""):
                continue
            try:
                model = get_model(field["options"])
            except LookupError:
                continue
            from apps.frappe.model.utils.model_names import name_filter

            exists = value in ("Administrator", "Guest") if field.get("options") == "User" else False
            exists = exists or model.objects.filter(**name_filter(model, getattr(value, "name", None) or getattr(value, "pk", value))).exists()
            if not exists:
                raise exceptions.LinkValidationError("Could not find {0}: {1}".format(field["options"], value))

    def validate_unique(self):
        from apps.erpnext.registry import get_meta, get_model
        if self._doctype_is_single():
            return
        model = get_model(self.doctype)
        for field in get_meta(self.doctype).get("fields", []):
            if not field.get("unique"):
                continue
            value = getattr(self, field["fieldname"], None)
            if value in (None, ""):
                continue
            qs = model.objects.filter(**{field["fieldname"]: value})
            if getattr(self, "name", None):
                from apps.frappe.model.utils.model_names import name_filter

                qs = qs.exclude(**name_filter(model, self.name))
            if qs.exists():
                raise exceptions.DuplicateEntryError("{0} must be unique".format(field.get("label") or field["fieldname"]))

    def validate_non_negative(self):
        from apps.erpnext.registry import get_meta
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("non_negative"):
                value = getattr(self, field["fieldname"], None)
                if value is not None and flt(value) < 0:
                    raise exceptions.NonNegativeError("{0} cannot be negative".format(field.get("label") or field["fieldname"]))
            min_value = field.get("min_value")
            if min_value:
                value = getattr(self, field["fieldname"], None)
                if value is not None and flt(value) < flt(min_value):
                    raise exceptions.ValidationError("{0} cannot be less than {1}".format(field.get("label") or field["fieldname"], min_value))
            max_value = field.get("max_value")
            if max_value:
                value = getattr(self, field["fieldname"], None)
                if value is not None and flt(value) > flt(max_value):
                    raise exceptions.ValidationError("{0} cannot be greater than {1}".format(field.get("label") or field["fieldname"], max_value))

    def validate_precision(self):
        from apps.erpnext.registry import get_meta

        for field in get_meta(self.doctype).get("fields", []):
            fieldname = field.get("fieldname")
            value = getattr(self, fieldname, None) if fieldname else None
            if value is None or value == "":
                continue
            fieldtype = field.get("fieldtype")
            if fieldtype in {"Currency", "Float", "Percent"}:
                setattr(self, fieldname, flt(value))
            elif fieldtype in {"Int", "Check"}:
                setattr(self, fieldname, cint(value))

    def precision(self, fieldname, parentfield=None):
        from apps.erpnext.registry import get_meta

        doctype = self.doctype
        if parentfield:
            for field in get_meta(self.doctype).get("fields", []):
                if field.get("fieldname") == parentfield:
                    doctype = field.get("options")
                    break
        for field in get_meta(doctype).get("fields", []):
            if field.get("fieldname") == fieldname and field.get("fieldtype") in {"Currency", "Float", "Percent"}:
                return get_field_precision(field)
        return None

    def _numeric_db_defaults(self):
        from apps.erpnext.registry import get_meta

        defaults = {}
        for df in get_meta(self.doctype).get("fields", []):
            if df.get("fieldtype") in {"Check", "Int"}:
                defaults[df.get("fieldname")] = 0
            elif df.get("fieldtype") in {"Float", "Currency", "Percent"}:
                defaults[df.get("fieldname")] = 0.0
        return defaults

    def _db_value(self, field, numeric_defaults):
        value = getattr(self, field.name)
        if value is None and field.name in numeric_defaults:
            return numeric_defaults[field.name]
        return _db_field_value(field, value)

    def db_insert(self, ignore_if_duplicate=False):
        from apps.erpnext.registry import get_model

        if not getattr(self, "name", None):
            from apps.frappe.model.naming import set_new_name

            set_new_name(self)
        if not getattr(self, "creation", None):
            self.set_user_and_timestamp()
        self.validate_precision()
        from django.db import IntegrityError
        model = get_model(self.doctype)
        numeric_defaults = self._numeric_db_defaults()
        values = {
            field.name: self._db_value(field, numeric_defaults)
            for field in model._meta.fields
            if hasattr(self, field.name)
        }
        if ignore_if_duplicate:
            from apps.frappe.model.utils.model_names import name_filter

            if getattr(self, "name", None) and model.objects.filter(**name_filter(model, self.name)).exists():
                return
        try:
            from django.db import transaction as _transaction

            with _transaction.atomic():
                model.objects.create(**values)
        except IntegrityError as e:
            if ignore_if_duplicate and "duplicate" in str(e).lower():
                pass
            else:
                if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                    raise exceptions.DuplicateEntryError("{0} must be unique".format(self.doctype))
                raise
        except Exception as e:
            if ignore_if_duplicate and "duplicate" in str(e).lower():
                pass
            else:
                raise
        self.db_save_children()
        self._sync_modified_from_db()

    def _sync_modified_from_db(self):
        from apps.erpnext.registry import get_model

        if not getattr(self, "name", None) or self._doctype_is_single():
            return
        model = get_model(self.doctype)
        if any(f.name == "modified" for f in model._meta.fields):
            stored = self._doc_qs(model).values_list("modified", flat=True).first()
            if stored is not None:
                self.modified = stored


    def db_update_single(self):
        from apps.erpnext.registry import get_meta
        from apps.frappe.models import Singles

        meta = get_meta(self.doctype)
        Singles.objects.filter(doctype=self.doctype).delete()
        rows = []
        for field in meta.get("fields", []):
            fieldname = field.get("fieldname")
            fieldtype = field.get("fieldtype")
            if not fieldname or fieldtype in NO_VALUE_FIELDTYPES or fieldtype in {"Table", "Table MultiSelect"}:
                continue
            value = getattr(self, fieldname, None)
            if value is None:
                continue
            rows.append(Singles(doctype=self.doctype, field=fieldname, value=_single_value_to_str(value)))
        for stamp in ("owner", "creation", "modified", "modified_by"):
            value = getattr(self, stamp, None)
            if value not in (None, ""):
                rows.append(Singles(doctype=self.doctype, field=stamp, value=_single_value_to_str(value)))
        Singles.objects.bulk_create(rows)
        self.db_save_children()

    def db_update(self):
        if self._doctype_is_single():
            return self.db_update_single()
        from apps.erpnext.registry import get_model
        model = get_model(self.doctype)
        numeric_defaults = self._numeric_db_defaults()
        values = {
            field.name: self._db_value(field, numeric_defaults)
            for field in model._meta.fields
            if field.name != "name" and hasattr(self, field.name)
        }
        self._doc_qs(model).update(**values)
        self.db_save_children()
        self._sync_modified_from_db()

    def db_delete(self):
        from apps.erpnext.registry import get_model
        model = get_model(self.doctype)
        self._doc_qs(model).delete()

    def db_save_children(self):
        from apps.erpnext.registry import get_meta, get_model
        from apps.frappe.model.naming import set_new_name
        for field in get_meta(self.doctype).get("fields", []):
            if field.get("fieldtype") not in {"Table", "Table MultiSelect"} or not field.get("options"):
                continue
            rows = getattr(self, field["fieldname"], []) or []
            try:
                child_model = get_model(field["options"])
            except LookupError:
                continue
            child_field_names = {f.name for f in child_model._meta.fields}
            if not {"parent", "parentfield", "parenttype"}.issubset(child_field_names):
                continue
            child_model.objects.filter(parent=self.name, parentfield=field["fieldname"], parenttype=self.doctype).delete()
            if not rows:
                continue
            for index, row in enumerate(rows, start=1):
                row.doctype = field["options"]
                row.parent = self.name
                row.parentfield = field["fieldname"]
                row.parenttype = self.doctype
                row.idx = index
                row.docstatus = getattr(self, "docstatus", 0)
                row.set_user_and_timestamp()
                if not getattr(row, "name", None):
                    set_new_name(row)
                values = {model_field.name: _db_field_value(model_field, getattr(row, model_field.name, None)) for model_field in child_model._meta.fields if hasattr(row, model_field.name)}
                child_model.objects.create(**values)


    @classmethod
    def from_model(cls, obj):
        data = {field.name: getattr(obj, field.name) for field in obj._meta.fields}
        data["doctype"] = getattr(obj, "doctype", obj._meta.verbose_name)
        return cls(data)

    @property
    def is_locked(self):
        signature = self.get_signature()
        if not file_lock.lock_exists(signature):
            return False

        if file_lock.lock_age(signature) > DOCUMENT_LOCK_EXPIRY:
            return False

        return True

    def get_latest(self):
        if not getattr(self, "_doc_before_save", None):
            self.load_doc_before_save()

        return self._doc_before_save

    def has_permission(self, permtype="read", *, debug=False, user=None) -> bool:
        """
        Call `frappe.permissions.has_permission` if `ignore_permissions` flag isn't truthy

        :param permtype: `read`, `write`, `submit`, `cancel`, `delete`, etc.
        """

        if self.flags.ignore_permissions:
            return True

        import frappe.permissions

        return frappe.permissions.has_permission(self.doctype, permtype, self, debug=debug, user=user)

    def check_if_locked(self):
        if not self.creation or not self.is_locked:
            return

        primary_action = None
        if file_lock.lock_age(self.get_signature()) > DOCUMENT_LOCK_SOFT_EXPIRY:
            primary_action = {
                "label": "Force Unlock",
                "server_action": "frappe.model.document.unlock_document",
                "hide_on_success": True,
                "args": {
                    "doctype": self.doctype,
                    "name": self.name,
                },
            }

        frappe.throw(
            _(
                "This document is currently locked and queued for execution. Please try again after some time."
            ),
            title=_("Document Queued"),
            primary_action=primary_action,
            exc=frappe.DocumentLockedError,
        )

    def validate_amended_from(self):
        if frappe.db.get_value(self.doctype, self.get("amended_from"), "docstatus") != 2:
            message = _(
                "{0} cannot be amended because it is not cancelled. Please cancel the document before creating an amendment."
            ).format(frappe.utils.get_link_to_form(self.doctype, self.get("amended_from")))
            frappe.throw(message, title=_("Amendment Not Allowed"))

    def get_value_before_save(self, fieldname):
        """Returns value of a field before saving

        Note: This function only works in save context like doc.save, doc.submit.
        """
        previous = self.get_doc_before_save()
        if not previous:
            return
        return previous.get(fieldname)

    def get_title(self):
        """Get the document title based on title_field or `title` or `name`"""
        return self.get(self.meta.get_title_field()) or ""

    def set_title_field(self):
        """Set title field based on template"""

        def get_values():
            values = self.as_dict()
            for key, value in values.items():
                if value is None:
                    values[key] = ""
            return values

        if self.meta.get("title_field") == "title":
            df = self.meta.get_field(self.meta.title_field)

            if df.options:
                self.set(df.fieldname, df.options.format(**get_values()))
            elif self.is_new() and not self.get(df.fieldname) and df.default:
                self.set(df.fieldname, df.default.format(**get_values()))

    def get_all_children(self, parenttype=None, *, include_computed=False) -> list["Document"]:
        """
        Return all child documents from **Table** type fields in a list.
        Excludes computed tables by default, unless `include_computed` is set to True.
        """

        children = []
        table_fieldnames = self._table_fieldnames if include_computed else self._non_computed_table_fieldnames

        for fieldname, child_doctype in table_fieldnames.items():
            if parenttype and child_doctype != parenttype:
                continue

            if value := self.get(fieldname):
                children.extend(value)

        return children

    def run_trigger(self, method, *args, **kwargs):
        return self.run_method(method, *args, **kwargs)

    def db_get(self, fieldname):
        """get database value for this fieldname"""
        return frappe.db.get_value(self.doctype, self.name, fieldname)

    def is_whitelisted(self, method_name):
        method = getattr(self, method_name, None)
        if not method:
            raise NotFound(f"Method {method_name} not found")

        is_whitelisted(getattr(method, "__func__", method))

    def validate_value(self, fieldname, condition, val2, doc=None, raise_exception=None):
        """Check that value of fieldname should be 'condition' val2
        else throw Exception."""
        if not doc:
            doc = self

        val1 = doc.get_value(fieldname)

        df = doc.meta.get_field(fieldname)
        val2 = doc.cast(val2, df)

        if not compare(val1, condition, val2):
            label = doc.meta.get_translated_label(fieldname)
            if doc.get("parentfield"):
                msg = _("Incorrect value in row {0}:").format(doc.idx)
            else:
                msg = _("Incorrect value:")

            if condition == "in":
                msg += _("{0} must be one of {1}").format(label, val2)
            elif condition == "not in":
                msg += _("{0} must be none of {1}").format(label, val2)
            elif condition == "^":
                msg += _("{0} must be beginning with '{1}'").format(label, val2)
            elif condition == "=":
                msg += _("{0} must be equal to '{1}'").format(label, val2)
            else:
                msg += _("{0} must be {1} {2}").format(label, condition, val2)

            msgprint(msg, raise_exception=raise_exception or True)

    def validate_table_has_rows(self, parentfield, raise_exception=None):
        """Raise exception if Table field is empty."""
        if not (isinstance(self.get(parentfield), list) and len(self.get(parentfield)) > 0):
            label = self.meta.get_translated_label(parentfield)
            frappe.throw(
                _("Table {0} cannot be empty").format(label), raise_exception or frappe.EmptyTableError
            )

    def round_floats_in(self, doc, fieldnames=None, do_not_round_fields=None):
        """Round floats for all `Currency`, `Float`, `Percent` fields for the given doc.

        :param doc: Document whose numeric properties are to be rounded.
        :param fieldnames: [Optional] List of fields to be rounded."""
        if not fieldnames:
            fieldnames = (
                df.fieldname
                for df in doc.meta.get("fields", {"fieldtype": ["in", ["Currency", "Float", "Percent"]]})
            )

        rounding_method = frappe.get_system_settings("rounding_method")
        for fieldname in fieldnames:
            if do_not_round_fields and fieldname in do_not_round_fields:
                continue

            doc.set(
                fieldname,
                flt(
                    doc.get(fieldname),
                    self.precision(fieldname, doc.get("parentfield")),
                    rounding_method=rounding_method,
                ),
            )

    def get_url(self):
        """Return Desk URL for this document."""
        return get_absolute_url(self.doctype, self.name)

    def get_signature(self):
        """Return signature (hash) for private URL."""
        return hashlib.sha224(f"{self.doctype}:{self.name}".encode(), usedforsecurity=False).hexdigest()

    def lock(self, timeout=None):
        """Creates a lock file for the given document. If timeout is set,
        it will retry every 1 second for acquiring the lock again

        :param timeout: Timeout in seconds, default 0"""
        signature = self.get_signature()
        if file_lock.lock_exists(signature):
            lock_exists = True
            if file_lock.lock_age(signature) > DOCUMENT_LOCK_EXPIRY:
                file_lock.delete_lock(signature)
                lock_exists = False
            if timeout:
                for _ in range(timeout):
                    time.sleep(1)
                    if not file_lock.lock_exists(signature):
                        lock_exists = False
                        break
            if lock_exists:
                raise frappe.DocumentLockedError
        file_lock.create_lock(signature)
        frappe.local.locked_documents.append(self)

    def unlock(self):
        """Delete the lock file for this document"""
        file_lock.delete_lock(self.get_signature())
        if self in frappe.local.locked_documents:
            frappe.local.locked_documents.remove(self)


    def get_db_value(self, key):
        return frappe.db.get_value(self.doctype, self.name, key)

    @property
    def parent_doc(self):
        parent_doc_ref = getattr(self, "_parent_doc", None)

        if isinstance(parent_doc_ref, weakref.ReferenceType):
            return parent_doc_ref()
        elif isinstance(parent_doc_ref, Document):
            return parent_doc_ref

    @parent_doc.setter
    def parent_doc(self, value):
        self._parent_doc = value

    def extend(self, key, value):
        try:
            value = iter(value)
        except TypeError:
            raise ValueError

        for v in value:
            self.append(key, v)

    def remove(self, doc):
        """Usage: from the parent doc, pass the child table doc to remove that child doc from the
        child table, thus removing it from the parent doc
        """
        if doc.get("parentfield"):
            self.get(doc.parentfield).remove(doc)

            for i, _d in enumerate(self.get(doc.parentfield)):
                _d.idx = i + 1


    def get_table_field_doctype(self, fieldname):
        return self._table_fieldnames.get(fieldname)

    def get_parentfield_of_doctype(self, doctype):
        return next(
            (
                fieldname
                for fieldname, child_doctype in self._table_fieldnames.items()
                if child_doctype == doctype
            ),
            None,
        )

    def get_label_from_fieldname(self, fieldname):
        """Return the associated label for fieldname.

        Args:
                fieldname (str): The fieldname in the DocType to use to pull the label.

        Return:
                str: The label associated with the fieldname, if found, otherwise `None`.
        """
        df = self.meta.get_field(fieldname)
        if df:
            return _(df.label) if df.label else None

    def update_modified(self):
        """Update modified timestamp"""
        self.set("modified", now())
        if getattr(self.meta, "issingle", False):
            frappe.db.set_single_value(self.doctype, "modified", self.modified, update_modified=False)
        else:
            frappe.db.set_value(self.doctype, self.name, "modified", self.modified, update_modified=False)

    def is_dummy_password(self, pwd):
        return "".join(set(pwd)) == "*"

    def get_password(self, fieldname="password", raise_exception=True):
        from frappe.utils.password import get_decrypted_password

        if self.get(fieldname) and not self.is_dummy_password(self.get(fieldname)):
            return self.get(fieldname)

        return get_decrypted_password(self.doctype, self.name, fieldname, raise_exception=raise_exception)

    def get_value(self, fieldname):
        df = self.meta.get_field(fieldname)
        val = self.get(fieldname)

        return self.cast(val, df)

    def cast(self, value, df):
        return cast_fieldtype(df.fieldtype, value, show_warning=False)

    @cached_property
    def _table_fieldnames(self) -> dict:
        return self.meta._table_doctypes

    @cached_property
    def _non_computed_table_fieldnames(self) -> dict:
        if self.doctype in DOCTYPES_FOR_DOCTYPE:
            return self._table_fieldnames

        return self.meta._non_computed_table_doctypes

    def set_new_name(self, force=False, set_name=None, set_child_names=True):
        """Calls `frappe.naming.set_new_name` for parent and child docs."""

        if self.flags.name_set and not force:
            return

        autoname = self.meta.autoname or ""

        if self.get("__newname") and autoname.lower() == "prompt":
            self.name = validate_name(self.doctype, self.get("__newname"))
            self.flags.name_set = True
            return

        if set_name:
            self.name = validate_name(self.doctype, set_name)
        else:
            set_new_name(self)

        if set_child_names:
            for d in self.get_all_children():
                set_new_name(d)

        self.flags.name_set = True
        assert self.name, "document name must be set after set_new_name"

    def set_name_in_children(self):
        for d in self.get_all_children():
            if not d.name:
                set_new_name(d)

    def db_update_all(self):
        """Raw update parent + children
        DOES NOT VALIDATE AND CALL TRIGGERS"""
        self.db_update()
        for fieldname in self._non_computed_table_fieldnames:
            for doc in self.get(fieldname):
                doc.db_update()

    @frappe.whitelist()
    def discard(self):
        self._action = "discard"
        self.check_if_latest()
        self.set_user_and_timestamp()

        if cint(self.docstatus) != 0:
            raise exceptions.ValidationError(_("Only draft documents can be discarded"))

        self.check_permission("write")

        self.run_method("before_discard")
        self.db_set("docstatus", 2)
        delattr(self, "_action")
        self.run_method("on_discard")

    def _handle_permission_failure(self, perm_type):
        from frappe.permissions import check_doctype_permission

        parent_doctype = self.get("parenttype") if self.meta.istable else None
        check_doctype_permission(parent_doctype or self.doctype, perm_type)
        self.raise_no_permission_to(perm_type)

    def raise_no_permission_to(self, perm_type):
        """Raise `frappe.PermissionError`."""
        doctype, name = self.doctype, self.name
        if self.meta.istable and self.get("parenttype"):
            doctype, name = self.parenttype, self.parent

        frappe.flags.error_message = _(
            "You need the '{0}' permission on {1} {2} to perform this action."
        ).format(
            _(perm_type),
            frappe.bold(_(doctype)),
            name or "",
        )
        raise frappe.PermissionError

    def copy_attachments_from_amended_from(self):
        """Copy attachments from `amended_from`"""
        from frappe.desk.form.load import get_attachments

        for attach_item in get_attachments(self.doctype, self.amended_from):
            _file = frappe.get_doc(
                {
                    "doctype": "File",
                    "file_url": attach_item.file_url,
                    "file_name": attach_item.file_name,
                    "attached_to_name": self.name,
                    "attached_to_doctype": self.doctype,
                    "attached_to_field": attach_item.attached_to_field,
                    "folder": attach_item.folder or "Home/Attachments",
                    "is_private": attach_item.is_private,
                }
            )
            _file.save()

    def update_child_table(self, fieldname: str, df: "DocField" | None = None):
        """sync child table for given fieldname"""
        df: DocField = df or self.meta.get_field(fieldname)
        if df.is_virtual:
            return
        all_rows = self.get(df.fieldname)

        if not (
            df.options in (self.flags.ignore_children_type or ())
            or frappe.get_meta(df.options).is_virtual == 1
        ):
            existing_row_names = [row.name for row in all_rows if row.name and not row.is_new()]

            tbl = frappe.qb.DocType(df.options)
            qry = (
                frappe.qb.from_(tbl)
                .where(tbl.parent == str(self.name))
                .where(tbl.parenttype == self.doctype)
                .where(tbl.parentfield == fieldname)
                .delete()
            )

            if existing_row_names:
                qry = qry.where(tbl.name.notin(existing_row_names))

            qry.run()

        for d in all_rows:
            d: Document
            d.db_update()

    def reset_computed_child_tables(self):
        """Reset computed child tables so that they are reloaded next time"""
        for df in self.meta.get_table_fields(include_computed=True):
            if df.is_virtual:
                self.__dict__.pop(df.fieldname, None)

    def _validate_non_negative(self):
        def get_msg(df):
            if self.get("parentfield"):
                return "{} {} #{}: {} {}".format(
                    frappe.bold(_(self.doctype)),
                    _("Row"),
                    self.idx,
                    _("Value cannot be negative for"),
                    frappe.bold(_(df.label, context=df.parent)),
                )
            else:
                return _("Value cannot be negative for {0}: {1}").format(
                    _(df.parent), frappe.bold(_(df.label, context=df.parent))
                )

        for df in self.meta.get(
            "fields", {"non_negative": ("=", 1), "fieldtype": ("in", ["Int", "Float", "Currency", "Percent"])}
        ):
            if flt(self.get(df.fieldname)) < 0:
                msg = get_msg(df)
                frappe.throw(msg, frappe.NonNegativeError, title=_("Negative Value"))

    def _validate_min_max_value(self):
        def get_msg(df, constraint):
            if self.get("parentfield"):
                return "{} {} #{}: {} {}".format(
                    frappe.bold(_(self.doctype)),
                    _("Row"),
                    self.idx,
                    constraint,
                    frappe.bold(_(df.label, context=df.parent)),
                )
            else:
                return "{} {}: {}".format(
                    constraint, _(df.parent), frappe.bold(_(df.label, context=df.parent))
                )

        for df in self.meta.get("fields", {"fieldtype": ("in", ["Int", "Float", "Currency", "Percent"])}):
            min_value = flt(df.get("min_value"))
            max_value = flt(df.get("max_value"))

            if df.fieldtype == "Int":
                min_value, max_value = cint(min_value), cint(max_value)

            if not (min_value or max_value):
                continue

            value = self.get(df.fieldname)
            if value in (None, ""):
                continue

            value = flt(value)

            if min_value and value < min_value:
                msg = get_msg(df, _("Value cannot be less than {0} for").format(frappe.bold(min_value)))
                frappe.throw(msg, title=_("Value is too small"))

            if max_value and value > max_value:
                msg = get_msg(df, _("Value cannot be more than {0} for").format(frappe.bold(max_value)))
                frappe.throw(msg, title=_("Value is too large"))

    def _fix_rating_value(self):
        for field in self.meta.get("fields", {"fieldtype": "Rating"}):
            value = self.get(field.fieldname)
            if not isinstance(value, float):
                value = flt(value)

            self.set(field.fieldname, max(0, min(value, 1)))

    def validate_workflow(self):
        """Validate if the workflow transition is valid"""
        if frappe.flags.in_install == "frappe":
            return
        workflow = self.meta.get_workflow()
        if workflow:
            validate_workflow(self)
            if self._action != "save":
                set_workflow_state_on_action(self, workflow, self._action)

    def is_child_table_same(self, fieldname):
        """Validate child table is same as original table before saving"""

        if self.is_new():
            return False

        same = True
        value = self.get(fieldname)
        original_value = self._doc_before_save.get(fieldname)

        if len(original_value) != len(value):
            same = False
        else:
            for i, d in enumerate(original_value):
                new_child = value[i].as_dict(convert_dates_to_str=True)
                original_child = d.as_dict(convert_dates_to_str=True)

                for key in ("modified", "modified_by", "creation"):
                    del new_child[key]
                    del original_child[key]

                if original_child != new_child:
                    same = False
                    break

        return same

    def get_permlevel_access(self, permission_type="write"):
        allowed_permlevels = []
        roles = frappe.get_roles()

        for perm in self.get_permissions():
            if perm.role in roles and perm.get(permission_type) and perm.permlevel not in allowed_permlevels:
                allowed_permlevels.append(perm.permlevel)

        return allowed_permlevels

    def has_permlevel_access_to(self, fieldname, df=None, permission_type="read"):
        if not df:
            df = self.meta.get_field(fieldname)

        return df.permlevel in self.get_permlevel_access(permission_type)

    def get_permissions(self):
        if self.meta.istable:
            permissions = frappe.get_meta(self.parenttype).permissions
        else:
            permissions = self.meta.permissions

        return permissions

    def run_notifications(self, method):
        """Run notifications for this method"""
        if (
            method == "onload"
            or (frappe.flags.in_import and frappe.flags.mute_emails)
            or frappe.flags.in_patch
            or frappe.flags.in_install
        ):
            return

        if self.flags.notifications_executed is None:
            self.flags.notifications_executed = []

        from frappe.email.doctype.notification.notification import evaluate_alert

        def _get_notifications():
            """Return enabled notifications for the current doctype."""
            from frappe.app_state import get_disabled_modules

            filters = {"enabled": 1, "document_type": self.doctype}
            if disabled_modules := get_disabled_modules():
                filters["module"] = ["not in", list(disabled_modules)]

            return frappe.get_all(
                "Notification",
                fields=["name", "event", "method"],
                filters=filters,
            )

        notifications = frappe.client_cache.get_value(
            f"notifications::{self.doctype}", generator=_get_notifications
        )

        if not notifications:
            return

        def _evaluate_alert(alert):
            if alert.name in self.flags.notifications_executed:
                return

            executed = self.flags.notifications_executed
            evaluate_alert(self, alert.name, alert.event)
            if self.flags.notifications_executed is None:
                self.flags.notifications_executed = executed
            self.flags.notifications_executed.append(alert.name)

        event_map = {
            "on_update": "Save",
            "after_insert": "New",
            "on_submit": "Submit",
            "on_cancel": "Cancel",
        }

        if not self.flags.in_insert and not self.flags.in_delete:
            event_map["on_change"] = "Value Change"

        for alert in notifications:
            event = event_map.get(method, None)
            if event and alert.event == event:
                _evaluate_alert(alert)
            elif alert.event == "Method" and method == alert.method:
                _evaluate_alert(alert)

    def reset_seen(self):
        """Clear _seen property and set current user as seen"""
        if (
            getattr(self.meta, "track_seen", False)
            and not getattr(self.meta, "issingle", False)
            and not self.is_new()
        ):
            frappe.db.set_value(
                self.doctype, self.name, "_seen", json.dumps([frappe.session.user]), update_modified=False
            )

    def notify_update(self):
        """Publish realtime that the current document is modified"""
        if (
            frappe.flags.in_import
            or frappe.flags.in_patch
            or frappe.flags.in_migrate
            or frappe.flags.in_install
        ):
            return

        frappe.publish_realtime(
            "doc_update",
            {"modified": self.modified, "doctype": self.doctype, "name": self.name},
            doctype=self.doctype,
            docname=self.name,
            after_commit=True,
        )

        if not self.meta.get("read_only") and not self.meta.get("issingle") and not self.meta.get("istable"):
            data = {"doctype": self.doctype, "name": self.name, "user": frappe.session.user}
            frappe.publish_realtime("list_update", data, after_commit=True)

    def save_version(self):
        """Save version info"""

        if (
            not getattr(self.meta, "track_changes", False)
            or self.doctype == "Version"
            or self.flags.ignore_version
            or frappe.flags.in_install
            or (not self._doc_before_save and frappe.flags.in_patch)
        ):
            return

        doc_to_compare = self._doc_before_save
        if not doc_to_compare and (amended_from := self.get("amended_from")):
            doc_to_compare = frappe.get_doc(self.doctype, amended_from)

        version = frappe.new_doc("Version")

        if not doc_to_compare and not self.flags.updater_reference:
            return

        if version.update_version_info(doc_to_compare, self):
            version.insert(ignore_permissions=True)

    @staticmethod
    def hook(f):
        """Decorator: Make method `hookable` (i.e. extensible by another app).

        Note: If each hooked method returns a value (dict), then all returns are
        collated in one dict and returned. Ideally, don't return values in hookable
        methods, set properties in the document."""

        def add_to_return_value(self, new_return_value):
            if new_return_value is None:
                self._return_value = self.get("_return_value")
                return

            if isinstance(new_return_value, dict):
                if not self.get("_return_value"):
                    self._return_value = {}
                self._return_value.update(new_return_value)
            else:
                self._return_value = new_return_value

        def compose(fn, *hooks):
            def runner(self, method, *args, **kwargs):
                add_to_return_value(self, fn(self, *args, **kwargs))
                for f in hooks:
                    try:
                        frappe.db._disable_transaction_control += 1
                        if not args and not _accepts_method_argument(f):
                            add_to_return_value(self, f(self, **kwargs))
                        else:
                            add_to_return_value(self, f(self, method, *args, **kwargs))
                    finally:
                        frappe.db._disable_transaction_control -= 1

                return self.__dict__.pop("_return_value", None)

            return runner

        def composer(self, *args, **kwargs):
            hooks = []
            method = f.__name__
            doc_events = frappe.get_doc_hooks()
            for handler in doc_events.get(self.doctype, {}).get(method, []) + doc_events.get("*", {}).get(
                method, []
            ):
                hooks.append(frappe.get_attr(handler))

            composed = compose(f, *hooks)
            return composed(self, method, *args, **kwargs)

        return composer

    @frappe.whitelist()
    def add_comment(
        self,
        comment_type: str = "Comment",
        text: str | None = None,
        comment_email: str | None = None,
        comment_by: str | None = None,
    ):
        """Add a comment to this document.

        :param comment_type: e.g. `Comment`. See Communication for more info."""

        return frappe.get_doc(
            {
                "doctype": "Comment",
                "comment_type": comment_type,
                "comment_email": comment_email or frappe.session.user,
                "comment_by": comment_by,
                "reference_doctype": self.doctype,
                "reference_name": self.name,
                "content": text or comment_type,
            }
        ).insert(ignore_permissions=True)

    def add_seen(self, user=None):
        """add the given/current user to list of users who have seen this document (_seen)"""
        if not user:
            user = frappe.session.user

        if self.meta.track_seen and not frappe.flags.read_only and not self.meta.issingle:
            _seen = self.get("_seen") or []
            _seen = frappe.parse_json(_seen)

            if user not in _seen:
                _seen.append(user)
                commit_after_response(
                    lambda: frappe.db.set_value(
                        self.doctype, self.name, "_seen", json.dumps(_seen), update_modified=False
                    )
                )

    def add_viewed(self, user=None, force=False, unique_views=False):
        """Add a view log for the current document"""

        if not (getattr(self.meta, "track_views", False) or force):
            return

        user = user or frappe.session.user

        if unique_views and frappe.db.exists(
            "View Log", {"reference_doctype": self.doctype, "reference_name": self.name, "viewed_by": user}
        ):
            return

        view_log = frappe.get_doc(
            {
                "doctype": "View Log",
                "viewed_by": user,
                "reference_doctype": self.doctype,
                "reference_name": self.name,
            }
        )
        if frappe.flags.read_only:
            view_log.deferred_insert()
        else:
            commit_after_response(lambda: view_log.insert(ignore_permissions=True))

        return view_log

    def log_error(self, title=None, message=None, *, defer_insert=False):
        """Helper function to create an Error Log"""
        return frappe.log_error(
            message=message,
            title=title,
            reference_doctype=self.doctype,
            reference_name=self.name,
            defer_insert=defer_insert,
        )

    def get_document_share_key(self, expires_on=None, no_expiry=False):
        if no_expiry:
            expires_on = None

        existing_key = frappe.db.exists(
            "Document Share Key",
            {
                "reference_doctype": self.doctype,
                "reference_docname": self.name,
                "expires_on": expires_on,
            },
        )
        if existing_key:
            doc = frappe.get_doc("Document Share Key", existing_key)
        else:
            doc = frappe.new_doc("Document Share Key")
            doc.reference_doctype = self.doctype
            doc.reference_docname = self.name
            doc.expires_on = expires_on
            doc.flags.no_expiry = no_expiry
            doc.insert(ignore_permissions=True)

        return doc.key

    def get_liked_by(self):
        liked_by = getattr(self, "_liked_by", None)
        if liked_by:
            return json.loads(liked_by)
        else:
            return []

    @property
    def __onload(self):
        onload = self.get("__onload")
        if onload is None:
            onload = frappe._dict()
            self.set("__onload", onload)

        return onload

    def get_assigned_users(self):
        assigned_users = frappe.get_all(
            "ToDo",
            fields=["allocated_to"],
            filters={
                "reference_type": self.doctype,
                "reference_name": self.name,
                "status": ("!=", "Cancelled"),
            },
            pluck="allocated_to",
        )

        return set(assigned_users)

    def add_tag(self, tag):
        """Add a Tag to this document"""
        from frappe.desk.doctype.tag.tag import DocTags

        DocTags(self.doctype).add(self.name, tag)

    def remove_tag(self, tag):
        """Remove a Tag to this document"""
        from frappe.desk.doctype.tag.tag import DocTags

        DocTags(self.doctype).remove(self.name, tag)

    def get_tags(self):
        """Return a list of Tags attached to this document"""
        from frappe.desk.doctype.tag.tag import DocTags

        tags = DocTags(self.doctype).get_tags(self.name)

        return [tag for tag in tags.split(",") if tag]

    def deferred_insert(self) -> None:
        """Push the document to redis temporarily and insert later.

        WARN: This doesn't guarantee insertion as redis can be restarted
        before data is flushed to database.
        """

        from frappe.deferred_insert import deferred_insert

        self.set_user_and_timestamp()

        doc = self.get_valid_dict(convert_dates_to_str=True, ignore_virtual=True)
        deferred_insert(doctype=self.doctype, records=doc)

    def __str__(self):
        return f"{self.doctype} ({self.name or 'unsaved'})"

    def __repr__(self):
        doctype = f"doctype={self.doctype}"
        name = self.name or "unsaved"
        docstatus = f" docstatus={self.docstatus}" if self.docstatus else ""
        parent = f" parent={self.parent}" if getattr(self, "parent", None) else ""

        return f"<{self.__class__.__name__}: {doctype} {name}{docstatus}{parent}>"

    @cached_property
    def permitted_fieldnames(self) -> set[str]:
        return set(get_permitted_fields(doctype=self.doctype, parenttype=getattr(self, "parenttype", None)))

    def delete_key(self, key):
        if key in self.__dict__:
            del self.__dict__[key]

    def get_virtual_field_value(self, df):
        fieldname = df.fieldname

        if (prop := getattr(type(self), fieldname, None)) and is_a_property(prop):
            return getattr(self, fieldname)

        elif options := getattr(df, "options", None):
            return self._evaluate_virtual_field_options(options)

    def show_unique_validation_message(self, e):
        if frappe.db.db_type == "mariadb":
            fieldname = str(e).split("'")[-2]
            label = None

            try:
                fieldname = self.get_field_name_by_key_name(fieldname)
            except IndexError:
                pass

            label = self.get_label_from_fieldname(fieldname)

            frappe.msgprint(_("{0} must be unique").format(label or fieldname))

        raise frappe.UniqueValidationError(self.doctype, self.name, e)

    def get_field_name_by_key_name(self, key_name):
        """MariaDB stores a mapping between `key_name` and `column_name`.
        Return the `column_name` associated with the `key_name` passed.

        Args:
                key_name (str): The name of the database index.

        Raises:
                IndexError: If the key is not found in the table.

        Return:
                str: The column name associated with the key.
        """
        return frappe.db.sql(
            f"""
            SHOW
                INDEX
            FROM
                `tab{self.doctype}`
            WHERE
                key_name=%s
            AND
                Non_unique=0
            """,
            key_name,
            as_dict=True,
        )[0].get("Column_name")

    def _get_missing_mandatory_fields(self):
        """Get mandatory fields that do not have any values"""

        def get_msg(df):
            if df.fieldtype in table_fields:
                return _("Error: Data missing in table {0}").format(_(df.label, context=df.parent))

            elif self.get("parentfield"):
                return _("Error: {0} Row #{1}: Value missing for: {2}").format(
                    frappe.bold(_(self.doctype)),
                    self.idx,
                    _(df.label, context=df.parent),
                )

            return _("Error: Value missing for {0}: {1}").format(_(df.parent), _(df.label, context=df.parent))

        def has_content(df):
            value = cstr(self.get(df.fieldname))
            has_text_content = strip_html(value).strip()
            has_img_tag = "<img" in value
            has_text_or_img_tag = has_text_content or has_img_tag

            if df.fieldtype == "Text Editor" and has_text_or_img_tag:
                return True
            elif df.fieldtype == "Code" and df.options == "HTML" and has_text_or_img_tag:
                return True
            elif df.fieldtype == "Check":
                return True
            else:
                return has_text_content

        missing = []

        for df in self.meta.get("fields", {"reqd": ("=", 1)}):
            if self.get(df.fieldname) in (None, []) or not has_content(df):
                missing.append((df.fieldname, get_msg(df)))

        if self.meta.istable:
            for fieldname in ("parent", "parenttype"):
                if not self.get(fieldname):
                    missing.append((fieldname, get_msg(_dict(label=fieldname))))

        return missing

    def get_invalid_links(self, is_submittable=False, link_value_cache=None):
        """Return list of invalid links and also update fetch values if not set.

        Args:
            is_submittable: Whether the parent document is submittable
            link_value_cache: Cache of prefetched link values for bulk optimization
        """
        is_submittable = is_submittable or self.meta.is_submittable

        def get_msg(df, docname):
            if self.get("parentfield"):
                return "{} #{}: {}: {}".format(_("Row"), self.idx, _(df.label, context=df.parent), docname)

            return f"{_(df.label, context=df.parent)}: {docname}"

        invalid_links = []
        cancelled_links = []

        for df in self.meta.get_link_fields() + self.meta.get("fields", {"fieldtype": ("=", "Dynamic Link")}):
            docname = self.get(df.fieldname)
            if not docname:
                continue

            assert isinstance(docname, str | int), f"Unexpected value for field {df.fieldname}: {docname}"

            if df.fieldtype == "Link":
                doctype = df.options
                if not doctype:
                    frappe.throw(_("Options not set for link field {0}").format(df.fieldname))
            else:
                assert df.fieldtype == "Dynamic Link"
                doctype = self.get(df.options)
                if not doctype:
                    frappe.throw(
                        _("{0} must be set first").format(self.meta.get_translated_label(df.options))
                    )
                invalidate_distinct_link_doctypes(df.parent, df.options, doctype)

            meta = frappe.get_meta(doctype)
            if not meta.istable:
                notify_link_count(doctype, docname)

            check_docstatus = is_submittable and frappe.get_meta(doctype).is_submittable

            fields_to_fetch = [
                _df
                for _df in self.meta.get_fields_to_fetch(df.fieldname)
                if not _df.get("fetch_if_empty")
                or (_df.get("fetch_if_empty") and not self.get(_df.fieldname))
            ]
            values_to_fetch = tuple(
                sorted(
                    {
                        "name",
                        *(_df.fetch_from.split(".")[-1] for _df in fields_to_fetch),
                        *(("docstatus",) if check_docstatus else ()),
                    }
                )
            )

            if link_value_cache is not None:
                cache_for_dt = link_value_cache.get(doctype, {})

                if frappe.db.db_type == "mariadb" and isinstance(docname, str):
                    cached = cache_for_dt.get(docname, _NOT_IN_CACHE)
                    if cached is _NOT_IN_CACHE:
                        cached = cache_for_dt.get(docname.casefold(), _NOT_IN_CACHE)
                else:
                    cached = cache_for_dt.get(docname, _NOT_IN_CACHE)

                if cached is _NOT_IN_CACHE:
                    values = _fetch_link_values(doctype, docname, values_to_fetch, meta)
                elif cached is None:
                    values = _dict.fromkeys(values_to_fetch, None)
                elif all(f in cached for f in values_to_fetch):
                    values = cached
                else:
                    values = _fetch_link_values(doctype, docname, values_to_fetch, meta)
                    if values is None and not meta.get("is_virtual"):
                        values = cached
            else:
                values = _fetch_link_values(doctype, docname, values_to_fetch, meta)

            values = values or _dict.fromkeys(values_to_fetch, None)

            if getattr(meta, "issingle", 0):
                values.name = doctype

            if not df.get("is_virtual"):
                setattr(self, df.fieldname, values.name)

            for _df in fields_to_fetch:
                if self.is_new() or not self.docstatus.is_submitted() or _df.allow_on_submit:
                    self.set_fetch_from_value(doctype, _df, values)

            if not values.name:
                invalid_links.append((df.fieldname, docname, get_msg(df, docname)))

            elif (
                df.fieldname != "amended_from"
                and check_docstatus
                and DocStatus(values.docstatus or 0).is_cancelled()
            ):
                cancelled_links.append((df.fieldname, docname, get_msg(df, docname)))

        return invalid_links, cancelled_links

    def set_fetch_from_value(self, doctype, df, values):
        fetch_from_fieldname = df.fetch_from.split(".")[-1]
        value = values[fetch_from_fieldname]
        if df.fieldtype in ["Small Text", "Text", "Data"]:
            from frappe.model.meta import get_default_df

            fetch_from_df = get_default_df(fetch_from_fieldname) or frappe.get_meta(doctype).get_field(
                fetch_from_fieldname
            )

            if not fetch_from_df:
                frappe.throw(
                    _('Please check the value of "Fetch From" set for field {0}').format(
                        frappe.bold(df.label)
                    ),
                    title=_("Wrong Fetch From value"),
                )

            fetch_from_ft = fetch_from_df.get("fieldtype")
            if fetch_from_ft == "Text Editor" and value:
                value = unescape_html(strip_html(value))
        setattr(self, df.fieldname, value)

    def _validate_selects(self):
        if frappe.flags.in_import:
            return

        for df in self.meta.get_select_fields():
            if df.fieldname == "naming_series" or not self.get(df.fieldname) or not df.options:
                continue

            options = (df.options or "").split("\n")

            if not filter(None, options):
                continue

            self.set(df.fieldname, cstr(self.get(df.fieldname)).strip())
            value = self.get(df.fieldname)

            if value not in options and not (frappe.in_test and value.startswith("_T-")):
                prefix = _("Row #{0}:").format(self.idx) if self.get("parentfield") else ""
                label = self.meta.get_translated_label(df.fieldname)
                comma_options = '", "'.join(_(each) for each in options)

                frappe.throw(
                    _('{0} {1} cannot be "{2}". It should be one of "{3}"').format(
                        prefix, label, value, comma_options
                    )
                )

    def _validate_data_fields(self):
        from frappe.utils import (
            split_emails,
            validate_email_address,
            validate_iban,
            validate_name,
            validate_phone_number,
            validate_phone_number_with_country_code,
            validate_url,
        )

        for phone_field in self.meta.get_phone_fields():
            phone = self.get(phone_field.fieldname)
            validate_phone_number_with_country_code(phone, phone_field.fieldname)

        for data_field in self.meta.get_data_fields():
            data = self.get(data_field.fieldname)
            if not data:
                continue

            data_field_options = data_field.get("options")
            old_fieldtype = data_field.get("oldfieldtype")

            if old_fieldtype and old_fieldtype != "Data":
                continue

            if data_field_options == "Email":
                if (self.owner in frappe.STANDARD_USERS) and (data in frappe.STANDARD_USERS):
                    continue

                for email_address in split_emails(data):
                    validate_email_address(email_address, throw=True)

            if data_field_options == "Name":
                validate_name(data, throw=True)

            if data_field_options == "Phone":
                validate_phone_number(data, throw=True)

            if data_field_options == "URL":
                validate_url(data, throw=True)

            if data_field_options == "IBAN":
                validate_iban(data, throw=True)

    def _validate_constants(self):
        if frappe.flags.in_import or self.is_new() or self.flags.ignore_validate_constants:
            return

        constants = [d.fieldname for d in self.meta.get("fields", {"set_only_once": ("=", 1)})]
        if constants:
            values = frappe.db.get_value(self.doctype, self.name, constants, as_dict=True)

        for fieldname in constants:
            df = self.meta.get_field(fieldname)

            if df.fieldtype == "Date" or df.fieldtype == "Datetime":
                value = str(values.get(fieldname))

            else:
                value = values.get(fieldname)

            if self.get(fieldname) != value:
                frappe.throw(
                    _("Value cannot be changed for {0}").format(self.meta.get_translated_label(fieldname)),
                    frappe.CannotChangeConstantError,
                )

    def _validate_length(self):
        if frappe.flags.in_install:
            return

        if getattr(self.meta, "issingle", 0):
            return

        type_map = frappe.db.type_map

        for fieldname, value in self.get_valid_dict(ignore_virtual=True).items():
            df = self.meta.get_field(fieldname)

            if not df or df.fieldtype == "Check":
                continue

            column_type = type_map[df.fieldtype][0] or None

            if column_type == "varchar":
                default_column_max_length = type_map[df.fieldtype][1] or None
                max_length = cint(df.get("length")) or cint(default_column_max_length)

                if len(cstr(value)) > max_length:
                    self.throw_length_exceeded_error(df, max_length, value)

            elif column_type in ("int", "bigint", "smallint"):
                if cint(df.get("length")) > 11:
                    column_type = "bigint"

                max_length = max_positive_value[column_type]

                if abs(cint(value)) > max_length:
                    self.throw_length_exceeded_error(df, max_length, value)

    def _validate_code_fields(self):
        for field in self.meta.get_code_fields():
            code_string = self.get(field.fieldname)
            language = field.get("options")

            if language == "Python":
                frappe.utils.validate_python_code(code_string, fieldname=field.label, is_expression=False)

            elif language == "PythonExpression":
                frappe.utils.validate_python_code(code_string, fieldname=field.label)

    def _sync_autoname_field(self):
        """Keep autoname field in sync with `name`"""
        autoname = self.meta.autoname or ""
        _empty, _field_specifier, fieldname = autoname.partition("field:")

        if fieldname and self.name and self.name != self.get(fieldname):
            self.set(fieldname, self.name)

    def throw_length_exceeded_error(self, df, max_length, value):
        if self.get("parentfield"):
            reference = _("{0}, Row {1}").format(_(self.doctype), self.idx)
        else:
            reference = f"{_(self.doctype)} {self.name}"

        frappe.throw(
            _("{0}: '{1}' ({3}) will get truncated, as max characters allowed is {2}").format(
                reference, frappe.bold(_(df.label, context=df.parent)), max_length, value
            ),
            frappe.CharacterLengthExceededError,
            title=_("Value too big"),
        )

    def _validate_update_after_submit(self):
        db_values = frappe.get_doc(self.doctype, self.name).as_dict()

        for key in self.as_dict():
            df = self.meta.get_field(key)
            db_value = db_values.get(key)

            if df and not df.allow_on_submit and not df.is_virtual and (self.get(key) or db_value):
                if df.fieldtype in table_fields:
                    self_value = len(self.get(key))
                    db_value = len(db_value)

                else:
                    self_value = self.get_value(key)
                if isinstance(self_value, datetime.timedelta) and isinstance(db_value, datetime.time):
                    db_value = datetime.timedelta(
                        hours=db_value.hour,
                        minutes=db_value.minute,
                        seconds=db_value.second,
                        microseconds=db_value.microsecond,
                    )
                if self_value != db_value:
                    frappe.throw(
                        _("{0} Not allowed to change {1} after submission from {2} to {3}").format(
                            f"Row #{self.idx}:" if self.get("parent") else "",
                            frappe.bold(_(df.label, context=df.parent)),
                            frappe.bold(db_value),
                            frappe.bold(self_value),
                        ),
                        frappe.UpdateAfterSubmitError,
                        title=_("Cannot Update After Submit"),
                    )

    def _sanitize_content(self):
        """Sanitize HTML and Email in field values. Used to prevent XSS.

        - Ignore if 'Ignore XSS Filter' is checked or fieldtype is 'Code'
        """
        if frappe.flags.in_install:
            return

        for fieldname, value in self.get_valid_dict(ignore_virtual=True).items():
            if not value or not isinstance(value, str):
                continue

            value = frappe.as_unicode(value)

            if "<" not in value and ">" not in value:
                continue

            elif "<!-- markdown -->" in value and not has_html_tags(value):
                continue

            df = self.meta.get_field(fieldname)
            sanitized_value = value

            if df and (
                df.get("ignore_xss_filter")
                or (df.get("fieldtype") in ("Data", "Small Text", "Text") and df.get("options") == "Email")
                or df.get("fieldtype") in ("Attach", "Attach Image", "Barcode", "Code", "JSON")
                or self.docstatus.is_cancelled()
                or (self.docstatus.is_submitted() and not df.get("allow_on_submit"))
            ):
                continue

            else:
                sanitized_value = sanitize_html(value, linkify=df and df.fieldtype == "Text Editor")

            self.set(fieldname, sanitized_value)

    def _save_passwords(self):
        """Save password field values in __Auth table"""
        from frappe.utils.password import remove_encrypted_password, set_encrypted_password

        if self.flags.ignore_save_passwords is True:
            return

        for df in self.meta.get("fields", {"fieldtype": ("=", "Password")}):
            if self.flags.ignore_save_passwords and df.fieldname in self.flags.ignore_save_passwords:
                continue
            new_password = self.get(df.fieldname)

            if not new_password:
                remove_encrypted_password(self.doctype, self.name, df.fieldname)

            if new_password and not self.is_dummy_password(new_password):
                set_encrypted_password(self.doctype, self.name, new_password, df.fieldname)

                self.set(df.fieldname, "*" * len(new_password))

    def get_formatted(
        self, fieldname, doc=None, currency=None, absolute_value=False, translated=False, format=None
    ):
        from frappe.utils.formatters import format_value

        df = self.meta.get_field(fieldname)
        if not df:
            from frappe.model.meta import get_default_df

            df = get_default_df(fieldname)

        if (
            df
            and df.fieldtype == "Currency"
            and not currency
            and (currency_field := df.get("options"))
            and (currency_value := self.get(currency_field))
        ):
            currency = frappe.db.get_value("Currency", currency_value, cache=True)

        if fieldname and (prop := getattr(type(self), fieldname, None)) and is_a_property(prop):
            val = getattr(self, fieldname)
        else:
            val = self.get(fieldname)

        if translated:
            val = _(val)

        if not doc:
            doc = getattr(self, "parent_doc", None) or self

        if (
            absolute_value or (getattr(doc, "flags", None) and doc.flags.get("absolute_value"))
        ) and isinstance(val, int | float):
            val = abs(self.get(fieldname))

        return format_value(val, df=df, doc=doc, currency=currency, format=format)

    def is_print_hide(self, fieldname, df=None, for_print=True):
        """Return True if fieldname is to be hidden for print.

        Print Hide can be set via the Print Format Builder or in the controller as a list
        of hidden fields. Example

                class MyDoc(Document):
                        def __setup__(self):
                                self.print_hide = ["field1", "field2"]

        :param fieldname: Fieldname to be checked if hidden.
        """
        meta_df = self.meta.get_field(fieldname)
        if meta_df and meta_df.get("__print_hide"):
            return True

        print_hide = 0

        if self.get(fieldname) == 0 and not self.meta.istable:
            print_hide = (df and df.print_hide_if_no_value) or (meta_df and meta_df.print_hide_if_no_value)

        if not print_hide:
            if df and df.print_hide is not None:
                print_hide = df.print_hide
            elif meta_df:
                print_hide = meta_df.print_hide

        return print_hide

    def in_format_data(self, fieldname):
        """Compatibility shim for third-party server-side print templates.

        The classic print format builder that populated `format_data_map` has been
        removed; builder layouts now render through PrintFormatGenerator, so every
        field is considered in scope here."""
        return True

    def reset_values_if_no_permlevel_access(self, has_access_to, high_permlevel_fields, mask_fields=None):
        """If the user does not have permissions at permlevel > 0, then reset the values to original / default"""
        to_reset = [
            df
            for df in high_permlevel_fields
            if (
                df.permlevel not in has_access_to
                and df.fieldtype not in display_fieldtypes
                and df.fieldname not in self.flags.get("ignore_permlevel_for_fields", [])
            )
        ]

        if not mask_fields:
            mask_fields = []

        to_reset = to_reset + mask_fields

        if not to_reset:
            return

        if self.is_new():
            ref_doc = frappe.new_doc(self.doctype)
        else:
            if self.parent_doc:
                parent_doc = self.parent_doc.get_latest()
                child_docs = [d for d in parent_doc.get(self.parentfield) if d.name == self.name]
                if not child_docs:
                    return
                ref_doc = child_docs[0]
            else:
                ref_doc = self.get_latest()

        masked_fieldnames = [df.fieldname for df in to_reset if df.get("mask_readonly")]
        ref_values = {}
        if not self.is_new() and masked_fieldnames:
            ref_values = frappe.db.get_value(self.doctype, self.name, masked_fieldnames, as_dict=True) or {}

        for df in to_reset:
            if df.get("mask_readonly") and not self.is_new():
                if df.fieldname in ref_values:
                    self.set(df.fieldname, ref_values[df.fieldname])
            else:
                self.set(df.fieldname, ref_doc.get(df.fieldname))

    def _extract_images_from_text_editor(self):
        from frappe.core.doctype.file.utils import extract_images_from_doc

        if self.doctype != "DocType":
            for df in self.meta.get("fields", {"fieldtype": ("=", "Text Editor")}):
                extract_images_from_doc(self, df.fieldname)

    def mask_fields(self):
        from frappe.model.utils.mask import mask_field_value

        mask_fields = frappe.get_meta(self.doctype).get_masked_fields()

        if mask_fields:
            self.flags.masked_fieldnames = {field.fieldname for field in mask_fields}

        for field in mask_fields:
            val = self.get(field.fieldname)
            self.set(field.fieldname, mask_field_value(field, val))

        for table_field in self.meta.get_table_fields():
            child_mask_fields = frappe.get_meta(table_field.options).get_masked_fields(
                parenttype=self.doctype
            )
            if not child_mask_fields:
                continue

            masked_fieldnames = {field.fieldname for field in child_mask_fields}
            for row in self.get(table_field.fieldname) or []:
                row.flags.masked_fieldnames = masked_fieldnames
                for field in child_mask_fields:
                    row.set(field.fieldname, mask_field_value(field, row.get(field.fieldname)))

    def update_children(self):
        """update child tables"""
        if getattr(self.meta, "is_virtual", False):
            return

        for df in self.meta.get_table_fields():
            self.update_child_table(df.fieldname, df)

    def update_single(self, d):
        """Updates values for Single type Document in `tabSingles`."""
        if self.meta.is_virtual:
            return

        frappe.db.delete("Singles", {"doctype": self.doctype})
        for field, value in d.items():
            if field != "doctype":
                frappe.db.sql(
                    """insert into `tabSingles` (doctype, field, value)
                    values (%s, %s, %s)""",
                    (self.doctype, field, value),
                )

        if self.doctype in frappe.db.value_cache:
            frappe.db.value_cache.pop(self.doctype, None)

    def _validate(self):
        self._validate_mandatory()
        self._validate_data_fields()
        self._validate_selects()
        self._validate_non_negative()
        self._validate_min_max_value()
        self._fix_rating_value()
        self._validate_code_fields()
        self._sync_autoname_field()
        self._extract_images_from_text_editor()
        self._sanitize_content()
        self._save_passwords()
        self.validate_workflow()
        self._validate_length()

        for d in self.get_all_children():
            d._validate_data_fields()
            d._validate_selects()
            d._validate_non_negative()
            d._validate_min_max_value()
            d._fix_rating_value()
            d._validate_code_fields()
            d._sync_autoname_field()
            d._extract_images_from_text_editor()
            d._sanitize_content()
            d._save_passwords()
            d._validate_length()
        if self.is_new():
            for fieldname in optional_fields:
                self.set(fieldname, None)
        else:
            self.validate_set_only_once()

    def _restore_masked_fields_from_db(self):
        """Restore masked field values from DB so that link-field user-permission checks
        are not tripped by the XXXXXXXX placeholder sent from the client."""
        if frappe.flags.in_install or frappe.session.user == "Administrator" or self.is_new():
            return

        mask_fields = self.meta.get_masked_fields()
        child_mask_fields = {
            table_field.fieldname: masked
            for table_field in self.meta.get_table_fields()
            if (masked := frappe.get_meta(table_field.options).get_masked_fields(parenttype=self.doctype))
        }
        if not mask_fields and not child_mask_fields:
            return

        db_doc = frappe.get_doc(self.doctype, self.name)
        for df in mask_fields:
            self.set(df.fieldname, db_doc.get(df.fieldname))

        for fieldname, masked in child_mask_fields.items():
            db_rows = {row.name: row for row in db_doc.get(fieldname)}
            for row in self.get(fieldname) or []:
                db_row = db_rows.get(row.name)
                if not db_row:
                    continue
                for df in masked:
                    row.set(df.fieldname, db_row.get(df.fieldname))

    def _validate_mandatory(self):
        if self.flags.ignore_mandatory:
            return

        missing = self._get_missing_mandatory_fields()
        for d in self.get_all_children():
            missing.extend(d._get_missing_mandatory_fields())

        if not missing:
            return

        for idx, msg in missing:
            msgprint(msg)

        if frappe.flags.print_messages:
            print(self.as_json().encode("utf-8"))

        raise frappe.MandatoryError(
            "[{doctype}, {name}]: {fields}".format(
                fields=", ".join(each[0] for each in missing), doctype=self.doctype, name=self.name
            )
        )

    def _prefetch_link_values(self):
        """Pre-fetch all link values including fetch_from fields for bulk validation.

        This optimization collects all Link/Dynamic Link values from the doc tree,
        then bulk-fetches them by doctype to eliminate N+1 queries.
        """
        if self.flags.ignore_links or self._action == "cancel":
            return

        from collections import defaultdict

        def _chunk(iterable, size):
            """Split iterable into chunks of given size."""
            lst = list(iterable)
            for i in range(0, len(lst), size):
                yield lst[i : i + size]

        self._link_value_cache = {}
        docs_to_validate = [self, *self.get_all_children()]

        prefetch_map = defaultdict(lambda: {"names": set(), "fields": {"name"}})

        for doc in docs_to_validate:
            is_submittable = self.meta.is_submittable
            link_fields = doc.meta.get_link_fields() + doc.meta.get(
                "fields", {"fieldtype": ("=", "Dynamic Link")}
            )

            for df in link_fields:
                docname = doc.get(df.fieldname)
                if not docname:
                    continue

                if not isinstance(docname, str | int):
                    continue

                if df.fieldtype == "Link":
                    doctype = df.options
                    if not doctype:
                        continue
                else:
                    doctype = doc.get(df.options)
                    if not doctype:
                        continue

                prefetch_map[doctype]["names"].add(docname)

                for fetch_df in doc.meta.get_fields_to_fetch(df.fieldname):
                    if fetch_df.get("fetch_from"):
                        source_field = fetch_df.fetch_from.split(".")[-1]
                        prefetch_map[doctype]["fields"].add(source_field)

                target_meta = frappe.get_meta(doctype)
                if is_submittable and target_meta.is_submittable:
                    prefetch_map[doctype]["fields"].add("docstatus")

        for doctype, data in prefetch_map.items():
            meta = frappe.get_meta(doctype)
            names = list(data["names"])
            fields = sorted(data["fields"])

            if not names:
                continue

            if meta.get("is_virtual"):
                for name in names:
                    try:
                        values = frappe.get_doc(doctype, name).as_dict()
                    except frappe.DoesNotExistError:
                        values = None
                    self._link_value_cache.setdefault(doctype, {})[name] = values

            elif getattr(meta, "issingle", 0):
                values = frappe.db.get_singles_dict(doctype)
                values["name"] = doctype
                for name in names:
                    self._link_value_cache.setdefault(doctype, {})[name] = frappe._dict(values)

            else:
                result_dict = {}
                field_tuple = tuple(fields)

                for name_chunk in _chunk(names, 1000):
                    results = frappe.db.get_all(
                        doctype,
                        filters={"name": ("in", name_chunk)},
                        fields=fields,
                    )
                    for row in results:
                        result_dict[row.name] = row
                        result_dict[str(row.name)] = row
                        if frappe.db.db_type == "mariadb" and isinstance(row.name, str):
                            result_dict[row.name.casefold()] = row

                for name in names:
                    if frappe.db.db_type == "mariadb" and isinstance(name, str):
                        cached_value = (
                            result_dict.get(name)
                            or result_dict.get(str(name))
                            or result_dict.get(name.casefold())
                        )
                    else:
                        cached_value = result_dict.get(name) or result_dict.get(str(name))

                    self._link_value_cache.setdefault(doctype, {})[name] = cached_value

                    if cached_value is not None and isinstance(name, str):
                        frappe.db.value_cache[doctype][name][field_tuple] = [cached_value]

    def _validate_links(self):
        if self.flags.ignore_links or self._action == "cancel":
            return

        self._prefetch_link_values()
        link_cache = getattr(self, "_link_value_cache", None)

        invalid_links, cancelled_links = self.get_invalid_links(link_value_cache=link_cache)

        for d in self.get_all_children():
            result = d.get_invalid_links(is_submittable=self.meta.is_submittable, link_value_cache=link_cache)
            invalid_links.extend(result[0])
            cancelled_links.extend(result[1])

        if invalid_links:
            msg = ", ".join(each[2] for each in invalid_links)
            frappe.throw(_("Could not find {0}").format(msg), frappe.LinkValidationError)

        if cancelled_links:
            msg = ", ".join(each[2] for each in cancelled_links)
            frappe.throw(_("Cannot link cancelled document: {0}").format(msg), frappe.CancelledLinkError)

    def get_valid_dict(
        self, sanitize=True, convert_dates_to_str=False, ignore_nulls=False, ignore_virtual=False
    ) -> _dict:
        d = _dict()
        field_values = self.__dict__
        field_map = self.meta._fields
        masked_fieldnames = self.flags.get("masked_fieldnames")

        for fieldname in self.meta.get_valid_fields():
            value = field_values.get(fieldname)

            if value and fieldname in (masked_fieldnames or ()):
                d[fieldname] = value
                continue

            if not sanitize and value is None:
                d[fieldname] = None
                continue

            df = field_map.get(fieldname)
            is_virtual_field = getattr(df, "is_virtual", False)

            if df:
                if is_virtual_field:
                    if ignore_virtual or fieldname not in self.permitted_fieldnames:
                        continue
                    value = self.get_virtual_field_value(df)

                fieldtype = df.fieldtype
                if isinstance(value, list) and fieldtype not in table_fields and fieldtype != "JSON":
                    frappe.throw(_("Value for {0} cannot be a list").format(_(df.label, context=df.parent)))

                if fieldtype == "Check":
                    value = 1 if cint(value) else 0

                elif fieldtype == "Int" and not isinstance(value, int):
                    value = cint(value)

                elif fieldtype == "JSON" and isinstance(value, (dict, list)):
                    value = json.dumps(value, separators=(",", ":"))

                elif fieldtype in float_like_fields and not isinstance(value, float):
                    value = flt(value)

                elif fieldtype == "Read Only" and not isinstance(value, str):
                    value = cstr(value)

                elif (fieldtype in datetime_fields and value == "") or (
                    getattr(df, "unique", False) and cstr(value).strip() == ""
                ):
                    value = None

            if convert_dates_to_str and isinstance(value, DatetimeTypes):
                value = str(value)

            if ignore_nulls and not is_virtual_field and value is None:
                continue

            if value is None and getattr(df, "not_nullable", False):
                if df.default:
                    value = df.default
                else:
                    value = get_not_null_defaults(df.fieldtype)

            d[fieldname] = value

        return d

    def get_doc_before_save(self) -> "Self":
        return getattr(self, "_doc_before_save", None)

    def has_value_changed(self, fieldname):
        """Return True if value has changed before and after saving."""
        from datetime import date, datetime, timedelta

        previous = self.get_doc_before_save()

        if not previous:
            return True

        previous_value = previous.get(fieldname)
        current_value = self.get(fieldname)

        if isinstance(previous_value, datetime):
            current_value = get_datetime(current_value)
        elif isinstance(previous_value, date):
            current_value = getdate(current_value)
        elif isinstance(previous_value, timedelta):
            current_value = get_timedelta(current_value)

        return previous_value != current_value

    def set_docstatus(self):
        docstatus = self.docstatus

        for d in self.get_all_children():
            d.set("docstatus", docstatus)

    def validate_set_only_once(self):
        """Validate that fields are not changed if not in insert"""
        set_only_once_fields = self.meta.get_set_only_once_fields()

        if set_only_once_fields and self._doc_before_save:
            for field in set_only_once_fields:
                fail = False
                value = self.get(field.fieldname)
                original_value = self._doc_before_save.get(field.fieldname)

                if field.fieldtype in table_fields:
                    fail = not self.is_child_table_same(field.fieldname)
                elif field.fieldtype in ("Date", "Datetime", "Time"):
                    fail = str(value) != str(original_value)
                else:
                    fail = value != original_value

                if fail:
                    frappe.throw(
                        _("Value cannot be changed for {0}").format(
                            frappe.bold(self.meta.get_translated_label(field.fieldname))
                        ),
                        exc=frappe.CannotChangeConstantError,
                    )

        return False

    def validate_higher_perm_levels(self):
        """If the user does not have permissions at permlevel > 0, then reset the values to original / default"""
        if self.flags.ignore_permissions or frappe.flags.in_install:
            return

        if frappe.session.user == "Administrator":
            return

        has_access_to = self.get_permlevel_access()
        high_permlevel_fields = self.meta.get_high_permlevel_fields()

        if high_permlevel_fields:
            self.reset_values_if_no_permlevel_access(has_access_to, high_permlevel_fields)

        if self.is_new():
            return

        for df in self.meta.get_table_fields():
            high_permlevel_fields = frappe.get_meta(df.options).get_high_permlevel_fields()
            if high_permlevel_fields:
                for d in self.get(df.fieldname):
                    d.reset_values_if_no_permlevel_access(has_access_to, high_permlevel_fields)

    def load_doc_before_save(self, *, raise_exception: bool = False):
        """load existing document from db before saving"""

        self._doc_before_save: "Self | None" = None

        if self.is_new():
            return

        try:
            self._doc_before_save = frappe.get_doc(self.doctype, self.name, for_update=True)
        except frappe.DoesNotExistError:
            if raise_exception:
                raise

            return frappe.clear_last_message()

        for fieldname in self._non_computed_table_fieldnames:
            for row in self.get(fieldname) or []:
                row._doc_before_save = next(
                    (d for d in (self._doc_before_save.get(fieldname) or []) if d.name == row.name), None
                )

    def db_set(self, fieldname, value=None, update_modified=True, notify=False, commit=False):
        """Set a value in the document object, update the timestamp and update the database.

        WARNING: This method does not trigger controller validations and should
        be used very carefully.

        :param fieldname: fieldname of the property to be updated, or a {"field":"value"} dictionary
        :param value: value of the property to be updated
        :param update_modified: default True. updates the `modified` and `modified_by` properties
        :param notify: default False. run doc.notify_update() to send updates via socketio
        :param commit: default False. run frappe.db.commit()
        """
        if isinstance(fieldname, dict):
            self.update(fieldname)
        else:
            self.set(fieldname, value)

        if update_modified and (self.doctype, self.name) not in frappe.flags.currently_saving:
            self.set("modified", now())
            self.set("modified_by", frappe.session.user)

        if not self.get_doc_before_save() and not self.meta.istable:
            self.load_doc_before_save()

        self.run_method("before_change")

        if self.name is None:
            return

        if self.meta.issingle:
            frappe.db.set_single_value(
                self.doctype,
                fieldname,
                value,
                modified=self.modified,
                modified_by=self.modified_by,
                update_modified=update_modified,
            )
        else:
            frappe.db.set_value(
                self.doctype,
                self.name,
                fieldname,
                value,
                self.modified,
                self.modified_by,
                update_modified=update_modified,
            )

        self.run_method("on_change")

        if notify:
            self.notify_update()

        if commit:
            frappe.db.commit()

    def set_onload(self, key, value):
        self.__onload[key] = value

    def get_onload(self, key=None):
        return self.__onload[key] if key else self.__onload

    def queue_action(self, action, **kwargs):
        """Run an action in background. If the action has an inner function,
        like _submit for submit, it will call that instead"""
        from frappe.utils.background_jobs import enqueue

        if hasattr(self, f"_{action}"):
            action = f"_{action}"

        self.check_if_locked()
        self.lock()

        enqueue_after_commit = kwargs.pop("enqueue_after_commit", None)
        if enqueue_after_commit is None:
            enqueue_after_commit = True

        return enqueue(
            "frappe.model.document.execute_action",
            __doctype=self.doctype,
            __name=self.name,
            __action=action,
            enqueue_after_commit=enqueue_after_commit,
            **kwargs,
        )

    def validate_from_to_dates(self, from_date_field: str, to_date_field: str) -> None:
        """Validate that the value of `from_date_field` is not later than the value of `to_date_field`."""
        from_date = self.get(from_date_field)
        to_date = self.get(to_date_field)
        if not (from_date and to_date):
            return

        if date_diff(to_date, from_date) < 0:
            table_row = ""
            if self.meta.istable:
                table_row = (
                    _("{0} row #{1}:").format(
                        _(frappe.unscrub(self.parentfield)),
                        self.idx,
                    )
                    + " "
                )

            frappe.throw(
                table_row
                + _("{0} must be after {1}").format(
                    frappe.bold(self.meta.get_translated_label(to_date_field)),
                    frappe.bold(self.meta.get_translated_label(from_date_field)),
                ),
                frappe.exceptions.InvalidDates,
            )

    def update_if_missing(self, d):
        """Set default values for fields without existing values"""
        if isinstance(d, BaseDocument):
            d = d.get_valid_dict()

        for key, value in d.items():
            if (
                value is not None
                and self.get(key) is None
                and key not in self.dont_update_if_missing
            ):
                self.set(key, value)

    def set(self, key, value, as_value=False):
        if key in RESERVED_KEYWORDS:
            return

        if not as_value and key in self._table_fieldnames:
            self.__dict__[key] = []

            if value:
                self.extend(key, value)

            return

        self.__dict__[key] = value

    def apply_fieldlevel_read_permissions(self):
        """Remove values the user is not allowed to read, and mask fields per mask permissions."""
        if frappe.session.user == "Administrator":
            return

        all_fields = self.meta.fields.copy()
        for table_field in self.meta.get_table_fields(include_computed=True):
            all_fields += frappe.get_meta(table_field.options).fields or []

        if all(df.permlevel == 0 for df in all_fields):
            self.mask_fields()
            return

        has_access_to = self.get_permlevel_access("read")

        for df in self.meta.fields:
            if df.permlevel and hasattr(self, df.fieldname) and df.permlevel not in has_access_to:
                try:
                    delattr(self, df.fieldname)
                except AttributeError:
                    continue

        for table_field in self.meta.get_table_fields(include_computed=True):
            for df in frappe.get_meta(table_field.options).fields or []:
                if df.permlevel and df.permlevel not in has_access_to:
                    for child in self.get(table_field.fieldname) or []:
                        if hasattr(child, df.fieldname):
                            delattr(child, df.fieldname)

        self.mask_fields()


def atomic():
    return transaction.atomic()


def get_field_currency(df, doc=None):
    import frappe
    from frappe.utils import cstr

    currency = None
    if not df.get("options"):
        return None
    if not doc:
        return None
    if not getattr(frappe.local, "field_currency", None):
        frappe.local.field_currency = frappe._dict()
    if not (
        frappe.local.field_currency.get((doc.doctype, doc.name), {}).get(df.fieldname)
        or (
            doc.get("parent")
            and frappe.local.field_currency.get((doc.doctype, doc.parent), {}).get(df.fieldname)
        )
    ):
        ref_docname = doc.get("parent") or doc.name
        if ":" in cstr(df.get("options")):
            split_opts = df.get("options").split(":")
            if len(split_opts) == 3 and doc.get(split_opts[1]):
                currency = frappe.get_cached_value(split_opts[0], doc.get(split_opts[1]), split_opts[2])
        else:
            currency = doc.get(df.get("options"))
            if doc.get("parenttype"):
                if currency:
                    ref_docname = doc.name
                else:
                    if frappe.get_meta(doc.parenttype).has_field(df.get("options")):
                        currency = frappe.db.get_value(doc.parenttype, doc.parent, df.get("options"))
                        if not currency:
                            parent = getattr(doc, "parent_doc", None)
                            if parent:
                                currency = parent.get(df.get("options"))
        if currency:
            frappe.local.field_currency.setdefault((doc.doctype, ref_docname), frappe._dict()).setdefault(
                df.fieldname, currency
            )
    return frappe.local.field_currency.get((doc.doctype, doc.name), {}).get(df.fieldname) or (
        doc.get("parent") and frappe.local.field_currency.get((doc.doctype, doc.parent), {}).get(df.fieldname)
    )


def get_field_precision(df, doc=None, currency=None):
    from apps.frappe.runtime import db
    from apps.frappe.utils.data import get_currency_precision

    if df.get("precision"):
        precision = cint(df.get("precision"))
    elif df.get("fieldtype") == "Currency":
        currency_precision = get_currency_precision()
        precision = currency_precision if currency_precision is not None else 2
    else:
        precision = cint(db.get_default("float_precision")) or 3
    return precision


def _single_value_to_str(value):
    if isinstance(value, bool):
        return "1" if value else "0"
    return str(value)


def bulk_insert(doctype, documents, ignore_duplicates=False, chunk_size=1000, commit_chunks=False):
    import itertools

    from apps.erpnext.registry import get_meta, get_model

    meta = get_meta(doctype)
    model = get_model(doctype)
    child_fields = [field for field in meta.get("fields", []) if field.get("fieldtype") in {"Table", "Table MultiSelect"}]

    def build(model_class, document):
        values = {
            field.name: _db_field_value(field, getattr(document, field.name))
            for field in model_class._meta.fields
            if hasattr(document, field.name)
        }
        return model_class(**values)

    documents = iter(documents)
    while batch := list(itertools.islice(documents, chunk_size)):
        model.objects.bulk_create([build(model, document) for document in batch], ignore_conflicts=ignore_duplicates)
        for field in child_fields:
            child_model = get_model(field["options"])
            rows = [row for document in batch for row in (getattr(document, field["fieldname"], None) or [])]
            if rows:
                child_model.objects.bulk_create(
                    [build(child_model, row) for row in rows], ignore_conflicts=ignore_duplicates
                )
        if commit_chunks:
            from apps.frappe.runtime import db

            db.commit()


from apps.frappe.model.base_document import get_controller


@functools.cache
def _accepts_method_argument(f: Callable) -> bool:
    """Return True if the doc event handler expects the `method` argument."""
    signature = inspect.signature(f)
    kinds = [p.kind for p in signature.parameters.values()]
    if any(kind == inspect.Parameter.VAR_POSITIONAL for kind in kinds):
        return True

    if sum(1 for kind in kinds if kind in _POSITIONAL_PARAM_KINDS) > 1:
        return True

    return False


def get_docs(
    doctype: str,
    filters: dict | None = None,
    *,
    chunk_size: int = 1000,
    limit: int | None = None,
    limit_start: int = 0,
    order_by: str = "creation asc",
    as_iterator: bool = False,
    for_update: bool = False,
    distinct: bool = False,
) -> list["Document"] | Generator["Document"]:
    """Fetch fully instantiated Document objects from the database.

    Returns a list of Documents by default. Pass `as_iterator=True` to get
    a chunked generator that yields a list of Documents per chunk to reduce memory usage.

    :param doctype: DocType of the records to fetch.
    :param filters: Dict or list of filters to apply.
    :param chunk_size: Number of records to fetch in each chunk if using `as_iterator`.
    :param limit: Maximum total number of records to fetch.
    :param limit_start: Start results at record #. Default 0.
    :param order_by: Order By string, e.g. `creation desc`.
    :param as_iterator: If True, returns a iterator yielding Documents.
    :param for_update: If True, locks the fetched rows for update.
    :param distinct: If True, return distinct rows.


    Note: Chunk size controls memory usage vs # of queries tradeoff. Using chunk size larger than
    10,000 is not advisable.
    """
    if is_virtual_doctype(doctype):
        frappe.throw(_("Virtual DocType {0} cannot be fetched in bulk.").format(doctype))

    meta = frappe.get_meta(doctype)

    if meta.issingle:
        frappe.throw(_("Single DocType {0} cannot be fetched in bulk.").format(doctype))

    if limit_start and limit is None:
        frappe.throw(_("limit cannot be None when limit_start is used"))

    if not order_by:
        order_by = "name asc"

    child_tables = [
        (df.fieldname, df.options) for df in meta.get_table_fields() if not is_virtual_doctype(df.options)
    ]
    controller = get_controller(doctype)
    lock_rows = for_update and frappe.db.db_type != "sqlite"

    iterator = _get_docs_generator(
        doctype,
        controller,
        child_tables,
        filters=filters,
        chunk_size=chunk_size,
        limit_start=limit_start,
        order_by=order_by,
        for_update=for_update,
        lock_rows=lock_rows,
        distinct=distinct,
    )

    iterator = itertools.islice(iterator, limit)

    if as_iterator:
        return iterator
    return list(iterator)


def _get_docs_generator(
    doctype,
    controller,
    child_tables,
    *,
    filters,
    chunk_size,
    limit_start,
    order_by,
    for_update,
    lock_rows,
    distinct,
) -> Generator["Document"]:
    offset = limit_start

    while True:
        chunk_data = _fetch_rows(
            doctype,
            filters=filters,
            order_by=order_by,
            limit=chunk_size,
            offset=offset,
            for_update=lock_rows,
            child_tables=child_tables,
            distinct=distinct,
        )
        if not chunk_data:
            break
        yield from _build_document_objects(controller, chunk_data, for_update)
        offset += chunk_size


def can_cache_doc(args) -> str | None:
    """
    Determine if document should be cached based on get_doc params.
    Return cache key if doc can be cached, None otherwise.
    """

    if not args:
        return

    doctype = args[0]
    name = doctype if len(args) == 1 or args[1] is None else args[1]

    if isinstance(doctype, str) and isinstance(name, str):
        return get_document_cache_key(doctype, name)


def _fetch_rows(doctype, *, filters, order_by, limit, offset, for_update, child_tables, distinct=False):
    kwargs = {}
    if limit is not None:
        kwargs["limit"] = limit
    if offset:
        kwargs["offset"] = offset

    data = frappe.qb.get_query(
        table=doctype,
        filters=filters or {},
        fields=["*"],
        order_by=order_by,
        for_update=for_update,
        distinct=distinct,
        **kwargs,
    ).run(as_dict=True)

    if not data:
        return []

    for row in data:
        row["doctype"] = doctype

    fetched_docs_by_name = {row.name: row for row in data}
    parent_names = list(fetched_docs_by_name.keys())

    for fieldname, child_doctype in child_tables:
        child_table_data = frappe.qb.get_query(
            table=child_doctype,
            filters={"parent": ("in", parent_names), "parenttype": doctype, "parentfield": fieldname},
            fields=["*"],
            order_by="idx asc",
            for_update=for_update,
        ).run(as_dict=True)

        for child in child_table_data:
            child["doctype"] = child_doctype

        for parent_doc in fetched_docs_by_name.values():
            parent_doc[fieldname] = []

        for child in child_table_data:
            if child.parent in fetched_docs_by_name:
                fetched_docs_by_name[child.parent][fieldname].append(child)

    return list(fetched_docs_by_name.values())


def _build_document_objects(controller, data: list, for_update: bool):
    for row in data:
        doc = controller(row)
        if for_update:
            doc.flags.for_update = True
        yield doc


def get_document_cache_key(doctype: str, name: str):
    return f"document_cache::{doctype}::{name}"


def _set_document_in_cache(key: str, doc: "Document") -> None:
    frappe.cache.set_value(key, doc, expires_in_sec=3600)


def execute_action(__doctype, __name, __action, **kwargs):
    """Execute an action on a document (called by background worker)"""
    doc = frappe.get_doc(__doctype, __name)
    doc.unlock()
    try:
        getattr(doc, __action)(**kwargs)
    except Exception:
        frappe.db.rollback()

        if frappe.message_log:
            msg = frappe.message_log[-1].get("message")
        else:
            msg = "<pre><code>" + frappe.get_traceback() + "</pre></code>"

        doc.add_comment("Comment", _("Action Failed") + "<br><br>" + msg)
    doc.notify_update()
