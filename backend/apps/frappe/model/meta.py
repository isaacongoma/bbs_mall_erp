import os
from datetime import datetime, timedelta
from frappe.utils.data import add_to_date, get_currency_precision, get_datetime
import json
from datetime import datetime
from functools import cached_property
from frappe.app_state import is_disabled_app_filtering_active, is_module_disabled
from frappe.model.base_document import (
    DOCTYPE_TABLE_FIELDS,
    TABLE_DOCTYPES_FOR_DOCTYPE,
    BaseDocument,
)
from frappe import N_, _
from frappe.modules import load_doctype_module
import frappe
from frappe.model import (
    NO_VALUE_FIELDS,
    child_table_fields,
    data_fieldtypes,
    default_fields,
    optional_fields,
    table_fields,
)
from apps.frappe.model.document import get_field_currency, get_field_precision
from apps.frappe.model.utils import is_single_doctype

is_single = is_single_doctype

__all__ = ["get_field_currency", "get_field_precision", "is_single"]

from apps.frappe.runtime import Meta
from apps.frappe.runtime import get_meta


def get_default_df(fieldname):
    if fieldname in (default_fields + child_table_fields):
        if fieldname in ("creation", "modified"):
            return frappe._dict(fieldname=fieldname, fieldtype="Datetime")

        elif fieldname in ("idx", "docstatus"):
            return frappe._dict(fieldname=fieldname, fieldtype="Int")

        elif fieldname in ("owner", "modified_by"):
            return frappe._dict(fieldname=fieldname, fieldtype="Link", options="User")

        return frappe._dict(fieldname=fieldname, fieldtype="Data")


DEFAULT_FIELD_LABELS = {
    "name": frappe.N_("ID"),
    "creation": frappe.N_("Created On"),
    "docstatus": frappe.N_("Document Status"),
    "idx": frappe.N_("Index"),
    "modified": frappe.N_("Last Updated On"),
    "modified_by": frappe.N_("Last Updated By"),
    "owner": frappe.N_("Created By"),
    "_user_tags": frappe.N_("Tags"),
    "_liked_by": frappe.N_("Liked By"),
    "_assign": frappe.N_("Assigned To"),
}


class MetaExtensions:
    def get_phone_fields(self):
        return self.get("fields", {"fieldtype": "Phone"})

    def get_masked_fields(self, parenttype=None):
        import copy

        if frappe.session.user == "Administrator":
            return []
        cache_key = f"masked_fields::{self.name}::{parenttype or ''}::{frappe.session.user}"
        masked_fields = frappe.cache.get_value(cache_key)

        if masked_fields is None:
            masked_fields = []
            permlevel_access = set(self.get_permlevel_access("mask", parenttype))
            for df in self.get("fields"):
                if df.get("mask") and df.permlevel not in permlevel_access:
                    df_copy = copy.deepcopy(df)
                    df_copy.mask_readonly = 1
                    masked_fields.append(df_copy)
            frappe.cache.set_value(cache_key, masked_fields)

        return masked_fields

    def get_code_fields(self):
        return self.get("fields", {"fieldtype": "Code"})

    def get_set_only_once_fields(self):
        """Return fields with `set_only_once` set"""
        return self._set_only_once_fields

    def get_global_search_fields(self):
        """Return list of fields with `in_global_search` set and `name` if set."""
        fields = self.get("fields", {"in_global_search": 1, "fieldtype": ["not in", NO_VALUE_FIELDS]})
        if getattr(self, "show_name_in_global_search", None):
            fields.append(frappe._dict(fieldtype="Data", fieldname="name", label="Name"))

        return fields

    def has_field(self, fieldname):
        """Return True if fieldname exists."""

        return fieldname in self._fields

    def get_label(self, fieldname):
        """Return the untranslated source label of the given fieldname."""
        if df := self.get_field(fieldname):
            return df.get("label")

        if fieldname in DEFAULT_FIELD_LABELS:
            return DEFAULT_FIELD_LABELS[fieldname]

        return "No Label"

    def get_translated_label(self, fieldname):
        """Return the translated label of the given fieldname."""
        return _(self.get_label(fieldname), context=self.name)

    def get_options(self, fieldname):
        return self.get_field(fieldname).options

    def get_search_fields(self):
        search_fields = self.search_fields or "name"
        search_fields = [d.strip() for d in search_fields.split(",")]
        if "name" not in search_fields:
            search_fields.append("name")

        assert "name" in search_fields, "search fields must always include 'name'"
        return search_fields

    def get_list_fields(self):
        list_fields = ["name"] + [
            d.fieldname for d in self.get("fields") if (d.in_list_view and d.fieldtype in data_fieldtypes)
        ]
        if self.title_field and self.title_field not in list_fields:
            list_fields.append(self.title_field)
        return list_fields

    def get_title_field(self):
        """Return the title field of this doctype,
        explict via `title_field`, or `title` or `name`"""
        title_field = getattr(self, "title_field", None)
        if not title_field and self.has_field("title"):
            title_field = "title"
        if not title_field:
            title_field = "name"

        assert title_field, "title field must resolve to a non-empty fieldname"
        return title_field

    def get_fieldnames_with_value(self, with_field_meta=False, with_virtual_fields=False):
        def is_value_field(df):
            return (df.fieldtype not in NO_VALUE_FIELDS) and (
                with_virtual_fields or not getattr(df, "is_virtual", False)
            )

        if with_field_meta:
            return [df for df in self.get("fields") if is_value_field(df)]

        return [df.fieldname for df in self.get("fields") if is_value_field(df)]

    def get_fields_to_check_permissions(self, user_permission_doctypes):
        fields = self.get(
            "fields",
            {
                "fieldtype": "Link",
                "parent": self.name,
                "ignore_user_permissions": ("!=", 1),
                "options": ("in", user_permission_doctypes),
            },
        )

        if self.name in user_permission_doctypes:
            fields.append(frappe._dict({"label": "Name", "fieldname": "name", "options": self.name}))

        return fields

    def get_high_permlevel_fields(self):
        """Build list of fields with high perm level and all the higher perm levels defined."""
        return self.high_permlevel_fields

    def get_permitted_fieldnames(
        self,
        parenttype=None,
        *,
        user=None,
        permission_type="read",
        with_virtual_fields=True,
    ):
        """Build list of `fieldname` with read perm level and all the higher perm levels defined.

        Note: If permissions are not defined for DocType, return all the fields with value.
        """
        permitted_fieldnames = []

        if self.istable and not parenttype:
            return permitted_fieldnames

        if not permission_type:
            permission_type = "select" if frappe.only_has_select_perm(self.name, user=user) else "read"

        if permission_type == "select":
            return self.get_select_fieldnames(with_virtual_fields)

        if not self.get_permissions(parenttype=parenttype):
            return self.get_fieldnames_with_value()

        permlevel_access = set(
            self.get_permlevel_access(permission_type=permission_type, parenttype=parenttype, user=user)
        )

        if 0 not in permlevel_access and permission_type in ("read", "select"):
            check_doctype = parenttype if self.istable and parenttype else self.name
            if frappe.share.get_shared(check_doctype, user, rights=["read"], limit=1):
                permlevel_access.add(0)

        permitted_fieldnames.extend(
            df.fieldname
            for df in self.get_fieldnames_with_value(
                with_field_meta=True, with_virtual_fields=with_virtual_fields
            )
            if df.permlevel in permlevel_access
        )
        return permitted_fieldnames

    def get_select_fieldnames(self, with_virtual_fields=True):
        """Search fields, plus the link title when its field is permitted."""
        fieldnames = self.get_search_fields()
        title = (
            self.get_field(self.title_field) if self.show_title_field_in_link and self.title_field else None
        )
        if not title:
            return fieldnames
        if title.permlevel or (title.is_virtual and not with_virtual_fields):
            return [fieldname for fieldname in fieldnames if fieldname != title.fieldname]
        if title.fieldname not in fieldnames:
            fieldnames.append(title.fieldname)
        return fieldnames

    def get_permlevel_access(self, permission_type="read", parenttype=None, *, user=None):
        has_access_to = set()
        roles = set(frappe.get_roles(user))
        for perm in self.get_permissions(parenttype):
            if perm.role in roles and perm.get(permission_type):
                has_access_to.add(int(perm.permlevel or 0))

        return has_access_to

    def get_permissions(self, parenttype=None):
        if self.istable and parenttype:
            permissions = frappe.get_meta(parenttype).permissions
        else:
            permissions = self.get("permissions", [])

        return [frappe._dict(p) if isinstance(p, dict) and not isinstance(p, frappe._dict) else p for p in permissions]

    def get_dashboard_data(self):
        """Return dashboard setup related to this doctype.

        This method will return the `data` property in the `[doctype]_dashboard.py`
        file in the doctype's folder, along with any overrides or extensions
        implemented in other Frappe applications via hooks.
        """
        data = frappe._dict()
        if not self.custom:
            try:
                module = load_doctype_module(self.name, suffix="_dashboard")
                if hasattr(module, "get_data"):
                    data = frappe._dict(module.get_data())
            except ImportError:
                pass

        self.add_doctype_links(data)

        if not self.custom:
            for hook in frappe.get_hooks("override_doctype_dashboards", {}).get(self.name, []):
                data = frappe._dict(frappe.get_attr(hook)(data=data))

        return data

    @cached_property
    def _dynamic_link_fields(self):
        return self.get("fields", {"fieldtype": "Dynamic Link"})

    @cached_property
    def _set_only_once_fields(self):
        set_only_once_fields = self.get("fields", {"set_only_once": 1})
        fieldnames = [d.fieldname for d in set_only_once_fields]

        for df in self.standard_set_once_fields:
            if df.fieldname not in fieldnames:
                set_only_once_fields.append(df)

        return set_only_once_fields

    @cached_property
    def _table_fields(self):
        if self.name == "DocType":
            return DOCTYPE_TABLE_FIELDS

        return self.get("fields", {"fieldtype": ["in", table_fields]})

    @cached_property
    def _non_computed_table_fields(self):
        if self.name == "DocType":
            return self._table_fields

        return self.get("fields", {"fieldtype": ["in", table_fields], "is_virtual": 0})

    @cached_property
    def _table_doctypes(self):
        return {field.fieldname: field.options for field in self._table_fields}

    @cached_property
    def _non_computed_table_doctypes(self):
        return {field.fieldname: field.options for field in self._non_computed_table_fields}

    @cached_property
    def ignore_versioning_fields(self) -> set[str]:
        return {df.fieldname for df in self.fields if getattr(df, "ignore_versioning", False)}

    @cached_property
    def high_permlevel_fields(self):
        return [df for df in self.fields if (df.permlevel or 0) > 0]

    def add_custom_links_and_actions(self):
        for doctype, fieldname in (
            ("DocType Link", "links"),
            ("DocType Action", "actions"),
            ("DocType State", "states"),
        ):
            for d in frappe.get_all(
                doctype, fields="*", filters=dict(parent=self.name, custom=1), ignore_ddl=True
            ):
                self.append(fieldname, d)

            order = json.loads(self.get(f"{fieldname}_order") or "[]")
            if order:
                name_map = {d.name: d for d in self.get(fieldname)}
                new_list = [name_map[name] for name in order if name in name_map]
                for d in self.get(fieldname):
                    if d not in new_list:
                        new_list.append(d)

                self.set(fieldname, new_list)

    def check_if_large_table(self):
        """Apply some heuristics to detect large tables.

        UI code can use this information to adapt accordingly."""
        self.is_large_table = False
        if self.istable or not frappe.db.table_exists(self.name):
            return

        if frappe.db.estimate_count(self.name) > LARGE_TABLE_SIZE_THRESHOLD:
            recent_change = frappe.db.sql(
                f"SELECT `creation` FROM `tab{self.name}` ORDER BY `creation` DESC LIMIT 1"
            )
            if recent_change and get_datetime(recent_change[0][0]) > (
                datetime.now() + timedelta(days=(-1 * LARGE_TABLE_RECENCY_THRESHOLD))
            ):
                self.is_large_table = True

    def add_doctype_links(self, data):
        """add `links` child table in standard link dashboard format"""
        dashboard_links = []

        if getattr(self, "links", None):
            dashboard_links.extend(self.links)

        if not data.transactions:
            data.transactions = []

        if not data.non_standard_fieldnames:
            data.non_standard_fieldnames = {}

        if not data.internal_links:
            data.internal_links = {}

        for link in dashboard_links:
            link.added = False
            if link.hidden:
                continue

            for group in data.transactions:
                group = frappe._dict(group)

                doctype = link.parent_doctype or link.link_doctype
                if link.group and _(group.label) == _(link.group):
                    if doctype not in group.get("items"):
                        group.get("items").append(doctype)
                    link.added = True

                    if not link.is_child_table:
                        if "fieldnames" not in group:
                            group["fieldnames"] = {}
                        group["fieldnames"][link.link_doctype] = link.link_fieldname

            if not link.added:
                new_group = dict(label=link.group, items=[link.parent_doctype or link.link_doctype])

                if not link.is_child_table:
                    new_group["fieldnames"] = {link.link_doctype: link.link_fieldname}

                data.transactions.append(new_group)

            if not data.fieldname and link.link_fieldname:
                data.fieldname = link.link_fieldname

            if not link.is_child_table:
                data.non_standard_fieldnames[link.link_doctype] = link.link_fieldname
            elif link.is_child_table:
                data.internal_links[link.parent_doctype] = [link.table_fieldname, link.link_fieldname]

    def get_row_template(self):
        return self.get_web_template(suffix="_row")

    def get_list_template(self):
        return self.get_web_template(suffix="_list")

    def get_web_template(self, suffix=""):
        """Return the relative path of the row template for this doctype."""
        module_name = frappe.scrub(self.module)
        doctype = frappe.scrub(self.name)
        template_path = frappe.get_module_path(
            module_name, "doctype", doctype, "templates", doctype + suffix + ".html"
        )
        if os.path.exists(template_path):
            return f"{module_name}/doctype/{doctype}/templates/{doctype}{suffix}.html"
        return None


def _ignore_versioning_fields(self):
    return {df.fieldname for df in self.get("fields") if df.get("ignore_versioning")}


MetaExtensions.ignore_versioning_fields = property(_ignore_versioning_fields)


def _fields_by_name(self):
    return {df.fieldname: df for df in self.get("fields") if df.get("fieldname")}


def _set_only_once_fields_cache(self):
    return [df for df in self.get("fields") if df.get("set_only_once")]


def _default_fields_list(self):
    return list(default_fields)[1:]


MetaExtensions.default_fields = property(_default_fields_list)
def _valid_fields_list(self):
    fields = list(default_fields)[1:] + [
        df.fieldname for df in self.get("fields") if df.fieldtype in data_fieldtypes
    ]
    if self.get("istable"):
        fields += list(child_table_fields)
    return fields


MetaExtensions._valid_fields = property(_valid_fields_list)
MetaExtensions.get_valid_fields = lambda self: self._valid_fields
MetaExtensions._fields = property(_fields_by_name)
MetaExtensions._set_only_once_fields = property(_set_only_once_fields_cache)

for _name, _value in list(vars(MetaExtensions).items()):
    if not _name.startswith("__"):
        setattr(Meta, _name, _value)


def is_field_hidden_by_app(df) -> bool:
    """Return True for a customization belonging to, or pointing at, a disabled app.

    A Link or Table field whose target is concealed cannot work, so it is hidden
    regardless of which app declared it.
    """
    from frappe.app_state import get_disabled_doctypes

    if df.get("is_app_disabled") and is_disabled_app_filtering_active():
        return True

    if is_module_disabled(df.get("module")):
        return True

    return (
        df.get("fieldtype") in ("Link", "Table", "Table MultiSelect")
        and df.get("options") in get_disabled_doctypes()
    )


def get_parent_dt(dt):
    if not frappe.is_table(dt):
        return ""

    return (
        frappe.db.get_value(
            "DocField",
            {"fieldtype": ("in", frappe.model.table_fields), "options": dt},
            "parent",
        )
        or ""
    )


def set_fieldname(field_id, fieldname):
    frappe.db.set_value("DocField", field_id, "fieldname", fieldname)


def get_precision_from_currency_format(currency: str) -> int:
    """Get precision from currency format string if applicable."""
    from frappe.utils.number_format import NumberFormat

    use_format_from_currency = frappe.get_system_settings("use_number_format_from_currency")
    number_format = NumberFormat.from_string(frappe.db.get_default("number_format"))
    if use_format_from_currency:
        currency_format = frappe.db.get_value("Currency", currency, "number_format", cache=True)
        number_format = NumberFormat.from_string(currency_format) if currency_format else number_format
    return number_format.precision


def trim_tables(doctype=None, dry_run=False, quiet=False):
    """
    Removes database fields that don't exist in the doctype (json or custom field). This may be needed
    as maintenance since removing a field in a DocType doesn't automatically
    delete the db field.
    """
    import click

    UPDATED_TABLES = {}
    filters = {"issingle": 0, "is_virtual": 0}
    if doctype:
        filters["name"] = doctype

    for doctype in frappe.get_all("DocType", filters=filters, pluck="name"):
        try:
            dropped_columns = trim_table(doctype, dry_run=dry_run)
            if dropped_columns:
                UPDATED_TABLES[doctype] = dropped_columns
        except frappe.db.TableMissingError:
            if quiet:
                continue
            click.secho(f"Ignoring missing table for DocType: {doctype}", fg="yellow", err=True)
            click.secho(f"Consider removing record in the DocType table for {doctype}", fg="yellow", err=True)
        except Exception as e:
            if quiet:
                continue
            click.echo(e, err=True)

    return UPDATED_TABLES


def trim_table(doctype, dry_run=True):
    key = f"table_columns::tab{doctype}"
    frappe.cache.delete_value(key)
    ignore_fields = default_fields + optional_fields + child_table_fields
    columns = frappe.db.get_table_columns(doctype)
    fields = frappe.get_meta(doctype, cached=False).get_fieldnames_with_value()

    def is_internal(field):
        return field not in ignore_fields and not field.startswith("_")

    columns_to_remove = [f for f in list(set(columns) - set(fields)) if is_internal(f)]
    DROPPED_COLUMNS = columns_to_remove[:]

    if columns_to_remove and not dry_run:
        columns_to_remove = ", ".join(f"DROP `{c}`" for c in columns_to_remove)
        frappe.db.sql_ddl(f"ALTER TABLE `tab{doctype}` {columns_to_remove}")

    return DROPPED_COLUMNS


def _update_field_order_based_on_insert_after(field_order, insert_after_map):
    """Update the field order based on insert_after_map"""

    retry_field_insertion = True

    while retry_field_insertion:
        retry_field_insertion = False

        for fieldname in list(insert_after_map):
            if fieldname not in field_order:
                continue

            custom_field_index = field_order.index(fieldname)
            for custom_field_name in insert_after_map.pop(fieldname):
                custom_field_index += 1
                field_order.insert(custom_field_index, custom_field_name)

            retry_field_insertion = True

    if insert_after_map:
        for fields in insert_after_map.values():
            field_order.extend(fields)


def _serialize(doc, no_nulls=False, *, is_child=False):
    out = frappe._dict()
    for key, value in doc.__dict__.items():
        if not is_child:
            if key in CACHE_PROPERTIES:
                continue

            if isinstance(value, ListOrTuple):
                if value and isinstance(value[0], BaseDocument):
                    out[key] = [_serialize(d, no_nulls=no_nulls, is_child=True) for d in value]

                continue

        if (not no_nulls and value is None) or isinstance(value, SerializableTypes):
            out[key] = value

    if not is_child:
        for fieldname in TABLE_DOCTYPES_FOR_DOCTYPE:
            if out.get(fieldname) is None:
                out[fieldname] = []

    return out


ListOrTuple = list | tuple
SerializableTypes = str | int | float | datetime
CACHE_PROPERTIES = frozenset(prop for prop, value in vars(Meta).items() if isinstance(value, cached_property))


def clear_meta_cache(doctype: str = "*"):
    key = f"doctype_meta::{doctype}"
    if doctype == "*":
        frappe.client_cache.delete_keys(key)
    else:
        frappe.client_cache.delete_value(key)


def load_meta(doctype):
    return Meta(doctype)


def get_table_columns(doctype):
    return frappe.db.get_table_columns(doctype)


def load_doctype_from_file(doctype):
    fname = frappe.scrub(doctype)
    with open(frappe.get_app_path("frappe", "core", "doctype", fname, fname + ".json")) as f:
        txt = json.loads(f.read())

    for d in txt.get("fields", []):
        d["doctype"] = "DocField"

    for d in txt.get("permissions", []):
        d["doctype"] = "DocPerm"

    txt["fields"] = [BaseDocument(d) for d in txt["fields"]]
    if "permissions" in txt:
        txt["permissions"] = [BaseDocument(d) for d in txt["permissions"]]

    return txt


    def get_translatable_fields(self):
        """Return all fields that are translation enabled"""
        return [d.fieldname for d in self.fields if d.translatable]

    def is_translatable(self, fieldname):
        """Return true of false given a field"""

        if field := self.get_field(fieldname):
            return field.translatable


LARGE_TABLE_SIZE_THRESHOLD = 100_000
LARGE_TABLE_RECENCY_THRESHOLD = 30
