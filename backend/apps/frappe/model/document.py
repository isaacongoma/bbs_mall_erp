from __future__ import annotations

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
from apps.frappe.model import datetime_fields, float_like_fields
from apps.frappe.runtime import _, msgprint, throw
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
    if value is None and field.empty_strings_allowed:
        return ""
    if isinstance(value, str) and value == "" and not field.empty_strings_allowed:
        return None
    return value


DYNAMIC_DEFAULTS = ("Today", "Now", "__user")
NO_VALUE_FIELDTYPES = {"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Heading", "Fold", "Image"}


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
        setattr(self, "__islocal", not bool(getattr(self, "name", None)))

    def set_onload(self, key, value):
        onload = self.__dict__.setdefault("__onload", {})
        onload[key] = value

    def get_onload(self, key=None):
        onload = self.__dict__.get("__onload", {})
        return onload.get(key) if key else onload

    def is_new(self):
        return bool(self.__dict__.get("__islocal"))

    def as_dict(self, no_nulls=False, no_default_fields=False, convert_dates_to_str=False, no_child_table_fields=False, no_private_properties=False):
        import datetime
        import decimal

        from apps.frappe.runtime import _dict

        default_fields = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"}
        child_fields = {"parent", "parentfield", "parenttype"}
        out = _dict()
        for key, value in self.__dict__.items():
            if key in ("flags", "dont_update_if_missing") or key.startswith("_"):
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

    def apply_fieldlevel_read_permissions(self):
        from apps.frappe.permissions import get_permitted_fields
        from apps.frappe.runtime import session

        permitted = set(get_permitted_fields(self.doctype, user=session.user))
        for key in list(self.__dict__):
            if key.startswith("_") or key in {"flags", "doctype"} or key in permitted:
                continue
            if isinstance(self.__dict__[key], list):
                continue
            self.__dict__[key] = None

    def get(self, key=None, filters=None, limit=None, default=None):
        if isinstance(key, dict):
            return self._get_rows_by_filters(key, filters, limit)
        value = getattr(self, key, None) if key is not None else None
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

    def set(self, key, value):
        setattr(self, key, value)
        return self

    def append(self, key, value):
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
        return row

    def run_method(self, method, *args, **kwargs):
        result = None
        fn = getattr(self, method, None)
        if fn:
            result = fn(*args, **kwargs)
        for handler in self.get_doc_event_handlers(method):
            handler(self, method)
        return result

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
                else:
                    continue
            if field.get("fieldtype") == "Check":
                default = int(default or 0)
            if default in DYNAMIC_DEFAULTS or (isinstance(default, str) and default.startswith(":")):
                continue
            setattr(self, field["fieldname"], default)
        for field in fields:
            fieldname = field.get("fieldname")
            if fieldname and field.get("fieldtype") not in NO_VALUE_FIELDTYPES and fieldname not in self.__dict__:
                setattr(self, fieldname, None)

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

    def insert(self, ignore_permissions=None, ignore_links=None, ignore_if_duplicate=False, ignore_mandatory=None):
        if ignore_permissions is not None:
            self.flags["ignore_permissions"] = ignore_permissions
        if ignore_links is not None:
            self.flags["ignore_links"] = ignore_links
        if ignore_mandatory is not None:
            self.flags["ignore_mandatory"] = ignore_mandatory
        self.check_permission("create")
        self.check_if_latest()
        self.set_user_and_timestamp()
        self.set_docstatus()
        self.run_method("before_insert")
        if not getattr(self, "name", None):
            set_new_name(self)
        self.set_parent_in_children()
        self.validate_higher_perm_levels()

        self.set_fetch_from_values()
        if not self.flags.get("ignore_validate"):
            self.run_method("before_validate")
            self.run_method("validate")
            self.run_method("before_save")
        self._validate()

        self.flags["in_insert"] = True
        self.db_insert(ignore_if_duplicate=ignore_if_duplicate)
        setattr(self, "__islocal", False)
        self.run_method("after_insert")
        self.run_method("on_update")
        self.run_method("on_change")
        self.flags["in_insert"] = False
        return self

    def save(self, ignore_permissions=None):
        from apps.frappe.runtime import flags as frappe_flags

        marker = (self.doctype, getattr(self, "name", None))
        saving = frappe_flags.currently_saving
        if saving is None:
            saving = frappe_flags.currently_saving = []
        saving.append(marker)
        try:
            return self._save(ignore_permissions)
        finally:
            if marker in saving:
                saving.remove(marker)

    def _save(self, ignore_permissions=None):
        if ignore_permissions is not None:
            self.flags["ignore_permissions"] = ignore_permissions
        if self.is_single():
            self.name = self.doctype
        if not getattr(self, "name", None):
            return self.insert(ignore_permissions=ignore_permissions)

        original_modified = getattr(self, "modified", None)
        original_modified_by = getattr(self, "modified_by", None)
        persisted = False
        try:
            self._doc_before_save = self.get_doc_before_save()

            if not hasattr(self, "_action"):
                if getattr(self, "docstatus", 0) == 1 and getattr(self._doc_before_save, "docstatus", 0) == 1:
                    self._action = "update_after_submit"
                else:
                    self._action = "save"

            if self._action == "submit":
                self.check_permission("submit")
                self.check_docstatus_transition(1)
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

            self.set_fetch_from_values()
            if not self.flags.get("ignore_validate"):
                self.run_method("before_validate")
                self.run_method("validate")
            self.validate_set_only_once()

            if not self.flags.get("ignore_validate"):
                self.run_before_save_methods()
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
        if getattr(self, "_action", None) == "submit":
            self.run_method("before_submit")
        elif getattr(self, "_action", None) == "cancel":
            self.run_method("before_cancel")
        elif getattr(self, "_action", None) == "update_after_submit":
            self.run_method("before_update_after_submit")
        else:
            self.run_method("before_save")

    def run_post_save_methods(self):
        if getattr(self, "_action", None) == "submit":
            self.run_method("on_submit")
        elif getattr(self, "_action", None) == "cancel":
            self.run_method("on_cancel")
            self.check_no_back_links_exist()
        elif getattr(self, "_action", None) == "update_after_submit":
            self.run_method("on_update_after_submit")
        else:
            self.run_method("on_update")
        self.run_method("on_change")

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

    def queue_action(self, action, **kwargs):
        from apps.frappe.runtime import throw

        throw("Background jobs are not available")

    def clear_cache(self):
        return None

    def notify_update(self):
        return None

    def add_comment(self, comment_type="Comment", text=None, comment_email=None, comment_by=None):
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
        now = timezone.now()
        user = getattr(session, "user", "Administrator") or "Administrator"
        if not getattr(self, "creation", None):
            self.creation = now
        if not getattr(self, "owner", None):
            self.owner = user
        self.modified = now
        self.modified_by = user

    def set_docstatus(self):
        if getattr(self, "docstatus", None) is None:
            self.docstatus = 0

    def is_single(self):
        from apps.erpnext.registry import get_meta

        return bool(get_meta(self.doctype).get("issingle"))

    def check_if_latest(self):
        if not getattr(self, "name", None) or not getattr(self, "modified", None) or self.is_single():
            return
        from apps.erpnext.registry import get_model
        db_doc = get_model(self.doctype).objects.only("modified").filter(pk=self.name).first()
        if db_doc and db_doc.modified and db_doc.modified != self.modified:
            raise exceptions.TimestampMismatchError("Document {0} {1} has been modified since it was loaded".format(self.doctype, self.name))

    def check_docstatus_transition(self, to_status):
        if getattr(self, "_doc_before_save", None) is None:
            self._doc_before_save = self.get_doc_before_save()
        if getattr(self, "_doc_before_save", None) is None:
            raise exceptions.DocstatusTransitionError("Cannot transition docstatus of unsaved document")
        from_status = getattr(self._doc_before_save, "docstatus", 0)
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

    def validate_higher_perm_levels(self):
        if self.flags.get("ignore_permissions"):
            return
        from apps.frappe.runtime import session
        if getattr(session, "user", "") == "Administrator":
            return

        from apps.frappe.permissions import get_roles
        user_roles = get_roles()

        from apps.erpnext.registry import get_meta
        meta = get_meta(self.doctype)

        allowed_permlevels = set()
        for perm in meta.get("permissions", []):
            if perm.get("role") in user_roles and perm.get("write"):
                allowed_permlevels.add(perm.get("permlevel", 0))

        for field in meta.get("fields", []):
            permlevel = field.get("permlevel", 0)
            if permlevel > 0 and permlevel not in allowed_permlevels:
                if getattr(self, "_doc_before_save", None):
                    setattr(self, field["fieldname"], getattr(self._doc_before_save, field["fieldname"], None))
                else:
                    setattr(self, field["fieldname"], field.get("default"))

    def check_permission(self, ptype="read", permtype=None):
        if permtype:
            ptype = permtype
        if self.flags.get("ignore_permissions"):
            return
        from apps.frappe.permissions import has_permission, raise_permission_error
        if not has_permission(self.doctype, ptype, doc=self):
            raise_permission_error(self.doctype, ptype)

    def get_doc_before_save(self):
        if not getattr(self, "name", None):
            return None
        try:
            from django.core.exceptions import ObjectDoesNotExist
            from apps.frappe.runtime import get_doc
            return get_doc(self.doctype, self.name, ignore_permissions=True)
        except (exceptions.DoesNotExistError, ObjectDoesNotExist):
            return None

    def has_value_changed(self, fieldname):
        if getattr(self, "_doc_before_save", None) is None:
            return True
        return getattr(self, fieldname, None) != getattr(self._doc_before_save, fieldname, None)

    def get_changed_fields(self):
        if getattr(self, "_doc_before_save", None) is None:
            return []
        from apps.erpnext.registry import get_model
        changed = []
        skip = {"modified", "modified_by", "creation"}
        for field in get_model(self.doctype)._meta.fields:
            if field.name in skip:
                continue
            if getattr(self, field.name, None) != getattr(self._doc_before_save, field.name, None):
                changed.append(field.name)
        return changed

    def validate_set_only_once(self):
        if getattr(self, "_doc_before_save", None) is None:
            return
        from apps.erpnext.registry import get_meta
        for field in get_meta(self.doctype).get("fields", []):
            if not field.get("set_only_once"):
                continue
            fieldname = field["fieldname"]
            old = getattr(self._doc_before_save, fieldname, None)
            new = getattr(self, fieldname, None)
            if old not in (None, "") and old != new:
                raise exceptions.CannotChangeConstantError("{0} cannot be changed".format(field.get("label") or fieldname))

    def validate_update_after_submit(self):
        from apps.erpnext.registry import get_meta
        fields = {field.get("fieldname"): field for field in get_meta(self.doctype).get("fields", [])}
        for fieldname in self.get_changed_fields():
            if fieldname in {"docstatus", "idx"}:
                continue
            field = fields.get(fieldname)
            if field and field.get("allow_on_submit"):
                continue
            raise exceptions.UpdateAfterSubmitError("Not allowed to change {0} after submit".format(fieldname))

    def set_fetch_from_values(self):
        from apps.erpnext.registry import get_meta, get_model
        meta = get_meta(self.doctype)
        fields = {field.get("fieldname"): field for field in meta.get("fields", [])}
        for field in meta.get("fields", []):
            fetch_from = field.get("fetch_from")
            if not fetch_from or "." not in fetch_from:
                continue
            if getattr(self, "docstatus", 0) == 1 and not field.get("allow_on_submit"):
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
                linked = get_model(link_doctype).objects.get(pk=link_value)
            except Exception:
                continue
            setattr(self, field["fieldname"], getattr(linked, source_fieldname, None))

    def _validate(self):
        self.validate_mandatory()
        self.validate_selects()
        if not self.flags.get("ignore_links"):
            self.validate_links()
        self.validate_unique()
        self.validate_non_negative()
        self.validate_precision()

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
            value = getattr(self, field["fieldname"], None)
            if value in (None, ""):
                continue
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
            if field.get("options") == "User":
                if value in ("Administrator", "Guest"):
                    exists = True
                elif hasattr(value, "email"):
                    exists = model.objects.filter(pk=value.pk).exists()
                else:
                    from django.db.models import Q

                    exists = model.objects.filter(Q(email=value) | Q(username=value)).exists()
            else:
                exists = model.objects.filter(pk=getattr(value, "pk", value)).exists()
            if not exists:
                raise exceptions.LinkValidationError("Could not find {0}: {1}".format(field["options"], value))

    def validate_unique(self):
        from apps.erpnext.registry import get_meta, get_model
        if self.is_single():
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
                qs = qs.exclude(pk=self.name)
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
            if min_value is not None:
                value = getattr(self, field["fieldname"], None)
                if value is not None and flt(value) < flt(min_value):
                    raise exceptions.ValidationError("{0} cannot be less than {1}".format(field.get("label") or field["fieldname"], min_value))
            max_value = field.get("max_value")
            if max_value is not None:
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
        values = {
            field.name: _db_field_value(field, getattr(self, field.name))
            for field in model._meta.fields
            if hasattr(self, field.name)
        }
        try:
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

        if not getattr(self, "name", None) or self.is_single():
            return
        model = get_model(self.doctype)
        if any(f.name == "modified" for f in model._meta.fields):
            stored = model.objects.filter(pk=self.name).values_list("modified", flat=True).first()
            if stored is not None:
                self.modified = stored

    def db_set(self, fieldname, value=None, update_modified=True, notify=False, commit=False):
        values = dict(fieldname) if isinstance(fieldname, dict) else {fieldname: value}
        for key, val in values.items():
            setattr(self, key, val)
        if update_modified:
            self.set_user_and_timestamp()
            values["modified"] = self.modified
            values["modified_by"] = self.modified_by
        if self.is_single():
            from apps.frappe.runtime import db

            for key, val in values.items():
                db.set_single_value(self.doctype, key, val)
            self.run_method("on_change")
            return self
        from apps.erpnext.registry import get_model
        get_model(self.doctype).objects.filter(pk=self.name).update(**values)
        self.run_method("on_change")
        if commit:
            from apps.frappe.runtime import db
            db.commit()
        return self

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
        if self.is_single():
            return self.db_update_single()
        from apps.erpnext.registry import get_model
        model = get_model(self.doctype)
        values = {
            field.name: _db_field_value(field, getattr(self, field.name))
            for field in model._meta.fields
            if field.name != "name" and hasattr(self, field.name)
        }
        model.objects.filter(pk=self.name).update(**values)
        self.db_save_children()
        self._sync_modified_from_db()

    def db_delete(self):
        from apps.erpnext.registry import get_model
        model = get_model(self.doctype)
        model.objects.filter(pk=self.name).delete()

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

    def validate_from_to_dates(self, from_date_field: str, to_date_field: str) -> None:
        from apps.frappe.utils.data import date_diff

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
                    frappe.bold(_(self.meta.get_label(to_date_field))),
                    frappe.bold(_(self.meta.get_label(from_date_field))),
                ),
                frappe.exceptions.InvalidDates,
            )

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

    def update_if_missing(self, d):
        """Set default values for fields without existing values"""
        if isinstance(d, Document):
            d = d.get_valid_dict()

        for key, value in d.items():
            if (
                value is not None
                and self.get(key) is None
                and key not in self.dont_update_if_missing
            ):
                self.set(key, value)

    def get_db_value(self, key):
        return frappe.db.get_value(self.doctype, self.name, key)

    @property
    def parent_doc(self):
        parent_doc_ref = getattr(self, "_parent_doc", None)

        if isinstance(parent_doc_ref, weakref.ReferenceType):
            return parent_doc_ref()
        elif isinstance(parent_doc_ref, Document):
            return parent_doc_ref

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











def atomic():
    return transaction.atomic()


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
