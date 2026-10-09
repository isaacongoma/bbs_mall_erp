from __future__ import annotations
import copy
import json
import os
import re
from frappe.database.schema import validate_column_length, validate_column_name
from frappe.desk.notifications import delete_notification_count_for, get_filters_for
from frappe.model import (
    child_table_fields,
    data_field_options,
    default_fields,
    no_value_fields,
    table_fields,
)
from frappe.model.base_document import RESERVED_KEYWORDS, get_controller
from frappe.model.meta import Meta
from frappe.permissions import ALL_USER_ROLE, AUTOMATIC_ROLES, SYSTEM_USER_ROLE
from frappe.query_builder.functions import Concat
from frappe.utils import cint, cstr, flt, get_datetime, is_a_property, random_string
from frappe import _
from frappe.model.document import Document
import frappe
def clear_permissions_cache(doctype):
    return None


class InvalidFieldNameError(frappe.ValidationError):
    pass


class UniqueFieldnameError(frappe.ValidationError):
    pass


class IllegalMandatoryError(frappe.ValidationError):
    pass


class DoctypeLinkError(frappe.ValidationError):
    pass


class WrongOptionsDoctypeLinkError(frappe.ValidationError):
    pass


class HiddenAndMandatoryWithoutDefaultError(frappe.ValidationError):
    pass


class NonUniqueError(frappe.ValidationError):
    pass


class CannotIndexedError(frappe.ValidationError):
    pass


class CannotCreateStandardDoctypeError(frappe.ValidationError):
    pass


class DocType(Document):
    doctype = "DocType"

    def __init__(self, data=None, **kwargs):
        values = dict(data or {})
        values.update(kwargs)
        fields = values.pop("fields", [])
        permissions = values.pop("permissions", [])
        for key in ("owner", "modified_by"):
            values.setdefault(key, "Administrator")
        for key in ("creation", "modified"):
            values.setdefault(key, frappe.utils.now())
        super().__init__(values)
        self.fields = [frappe._dict(row) for row in fields]
        self.permissions = [self._permission_row(row, index) for index, row in enumerate(permissions, start=1)]

    def _permission_row(self, row, index):
        values = dict(row)
        values.update(
            doctype="DocPerm",
            parent=self.name,
            parenttype="DocType",
            parentfield="permissions",
            idx=values.get("idx") or index,
            name=values.get("name") or f"{self.name}-perm-{index}",
        )
        return frappe.get_doc(values)

    @classmethod
    def from_meta(cls, name):
        import copy

        from apps.frappe.model import dynamic_doctype
        from apps.frappe.models import DocTypeTable

        row = DocTypeTable.objects.filter(name=name, custom=1).first()
        if row:
            values = dynamic_doctype.meta_from_rows(row)
        else:
            meta = frappe.get_meta(name)
            values = copy.deepcopy(dict(meta))
        values["doctype"] = "DocType"
        values["name"] = name
        return cls(values)

    def _validate_runtime(self):
        if not self.name:
            frappe.throw(_("DocType name is required"))
        if not re.match(r"^[A-Za-z0-9 _\-\.\(\)]+$", self.name):
            frappe.throw(_("DocType name {0} contains invalid characters").format(self.name), frappe.NameError)
        seen = set()
        for df in self.fields:
            fieldname = df.get("fieldname")
            if not fieldname:
                continue
            if fieldname in seen:
                frappe.throw(_("Fieldname {0} appears multiple times").format(fieldname), UniqueFieldnameError)
            seen.add(fieldname)
            if not re.match(r"^[a-z0-9_]+$", fieldname) and not df.get("is_virtual"):
                frappe.throw(_("Fieldname {0} is not valid").format(fieldname), InvalidFieldNameError)

    def save(self, *args, **kwargs):
        from apps.frappe.model import dynamic_doctype

        if self.get("custom") or self.name in dynamic_doctype_names():
            self._validate_runtime()
            dynamic_doctype.create_or_update(self)
        frappe.clear_cache(doctype=self.name)
        return self

    def insert(self, *args, **kwargs):
        from apps.frappe.model import dynamic_doctype

        if frappe.db.exists("DocType", self.name):
            frappe.throw(_("DocType {0} already exists").format(self.name), frappe.DuplicateEntryError)
        self._validate_runtime()
        self.custom = 1
        dynamic_doctype.create_or_update(self)
        frappe.clear_cache(doctype=self.name)
        return self

    def delete(self, *args, **kwargs):
        frappe.delete_doc("DocType", self.name, force=1, ignore_permissions=True)


def dynamic_doctype_names():
    from apps.frappe.models import DocTypeTable

    return set(DocTypeTable.objects.filter(custom=1).values_list("name", flat=True))


def validate_series(dt, autoname=None, name=None):
    """Validate if `autoname` property is correctly set."""
    if not autoname:
        autoname = dt.autoname
    if not name:
        name = dt.name

    if not autoname and dt.get("fields", {"fieldname": "naming_series"}):
        dt.autoname = "naming_series:"
    elif dt.autoname and dt.autoname.startswith("naming_series:"):
        fieldname = dt.autoname.split("naming_series:", 1)[0] or "naming_series"
        if not dt.get("fields", {"fieldname": fieldname}):
            frappe.throw(
                _("Fieldname called {0} must exist to enable autonaming").format(frappe.bold(fieldname)),
                title=_("Field Missing"),
            )

    if autoname and autoname.startswith("field:"):
        field = autoname.split(":")[1]
        if not field or field not in [df.fieldname for df in dt.fields]:
            frappe.throw(_("Invalid fieldname '{0}' in autoname").format(field))
        else:
            for df in dt.fields:
                if df.fieldname == field:
                    df.unique = 1
                    break

    if (
        autoname
        and (not autoname.startswith("field:"))
        and (not autoname.startswith("eval:"))
        and (autoname.lower() not in ("prompt", "hash"))
        and (not autoname.startswith("naming_series:"))
        and (not autoname.startswith("format:"))
    ):
        prefix = autoname.split(".", 1)[0]
        doctype = frappe.qb.DocType("DocType")
        used_in = (
            frappe.qb.from_(doctype)
            .select(doctype.name)
            .where(doctype.autoname.like(Concat(prefix, ".%")))
            .where(doctype.name != name)
        ).run()
        if used_in:
            frappe.throw(_("Series {0} already used in {1}").format(prefix, used_in[0][0]))

    validate_empty_name(dt, autoname)


def validate_empty_name(dt, autoname):
    if dt.doctype == "Customize Form":
        return

    if not autoname and not (dt.issingle or dt.istable):
        try:
            controller = get_controller(dt.name)
        except ImportError:
            controller = None

        if not controller or (not hasattr(controller, "autoname")):
            frappe.toast(_("Warning: Naming is not set"), indicator="yellow")


def validate_autoincrement_autoname(dt: DocType | "CustomizeForm") -> bool:
    """Checks if can doctype can change to/from autoincrement autoname"""

    def get_autoname_before_save(dt: DocType | "CustomizeForm") -> str:
        if dt.doctype == "Customize Form":
            property_value = frappe.db.get_value(
                "Property Setter", {"doc_type": dt.doc_type, "property": "autoname"}, "value"
            )
            if not property_value:
                return frappe.db.get_value("DocType", dt.doc_type, "autoname") or ""

            return property_value

        return getattr(dt.get_doc_before_save(), "autoname", "")

    if not dt.is_new():
        autoname_before_save = get_autoname_before_save(dt)
        is_autoname_autoincrement = dt.autoname == "autoincrement"

        if (is_autoname_autoincrement and autoname_before_save != "autoincrement") or (
            not is_autoname_autoincrement and autoname_before_save == "autoincrement"
        ):
            if dt.doctype == "Customize Form":
                frappe.throw(_("Cannot change to/from autoincrement autoname in Customize Form"))

            if frappe.get_meta(dt.name).issingle:
                return False

            if not frappe.get_all(dt.name, limit=1):
                return True

            frappe.throw(
                _("Can only change to/from Autoincrement naming rule when there is no data in the doctype")
            )

    return False


def change_name_column_type(doctype_name: str, type: str) -> None:
    """Changes name column type"""

    args = (
        (doctype_name, "name", type, False, True)
        if (frappe.db.db_type == "postgres")
        else (doctype_name, "name", type, True)
    )

    frappe.db.change_column_type(*args)


def validate_links_table_fieldnames(meta):
    """Validate fieldnames in Links table"""
    if not meta.links or frappe.flags.in_patch or frappe.flags.in_fixtures or frappe.flags.in_migrate:
        return

    fieldnames = tuple(field.fieldname for field in meta.fields)
    for index, link in enumerate(meta.links, 1):
        _test_connection_query(doctype=link.link_doctype, field=link.link_fieldname, idx=index)

        if not link.is_child_table:
            continue

        if not link.parent_doctype:
            message = _("Document Links Row #{0}: Parent DocType is mandatory for internal links").format(
                index
            )
            frappe.throw(message, frappe.ValidationError, _("Parent Missing"))

        if not link.table_fieldname:
            message = _("Document Links Row #{0}: Table Fieldname is mandatory for internal links").format(
                index
            )
            frappe.throw(message, frappe.ValidationError, _("Table Fieldname Missing"))

        if meta.name == link.parent_doctype:
            field_exists = link.table_fieldname in fieldnames
        else:
            field_exists = frappe.get_meta(link.parent_doctype).has_field(link.table_fieldname)

        if not field_exists:
            message = _("Document Links Row #{0}: Could not find field {1} in {2} DocType").format(
                index, frappe.bold(link.table_fieldname), frappe.bold(meta.name)
            )
            frappe.throw(message, frappe.ValidationError, _("Invalid Table Fieldname"))


def _test_connection_query(doctype, field, idx):
    """Make sure that connection can be queried.

    This function executes query similar to one that would be executed for
    finding count on dashboard and hence validates if fieldname/doctype are
    correct.
    """
    filters = get_filters_for(doctype) or {}
    filters[field] = ""

    try:
        if frappe.db.db_type == "sqlite" and field not in frappe.get_meta(doctype).get_valid_columns():
            raise InvalidFieldNameError(field)
        frappe.get_all(doctype, filters=filters, limit=1, distinct=True, ignore_ifnull=True)
    except Exception as e:
        frappe.clear_last_message()
        msg = _("Document Links Row #{0}: Invalid doctype or fieldname.").format(idx)
        msg += "<br>" + str(e)
        frappe.throw(msg, InvalidFieldNameError)


def validate_fields_for_doctype(doctype):
    meta = frappe.get_meta(doctype, cached=False)
    validate_links_table_fieldnames(meta)
    validate_fields(meta)


def validate_fields(meta: Meta):
    """Validate doctype fields. Checks
    1. There are no illegal characters in fieldnames
    2. If fieldnames are unique.
    3. Validate column length.
    4. Fields that do have database columns are not mandatory.
    5. `Link` and `Table` options are valid.
    6. **Hidden** and **Mandatory** are not set simultaneously.
    7. `Check` type field has default as 0 or 1.
    8. `Dynamic Links` are correctly defined.
    9. Precision is set in numeric fields and is between 1 & 6.
    10. Fold is not at the end (if set).
    11. `search_fields` are valid.
    12. `title_field` and title field pattern are valid.
    13. `unique` check is only valid for Data, Link and Read Only fieldtypes.
    14. `unique` cannot be checked if there exist non-unique values.

    :param meta: `frappe.model.meta.Meta` object to check."""

    def check_illegal_characters(fieldname):
        validate_column_name(fieldname)

    def check_invalid_fieldnames(docname, fieldname):
        RESERVED_DOCFIELD_NAMES = frozenset(("autoname",))

        if fieldname in RESERVED_KEYWORDS:
            frappe.throw(
                _("{0}: fieldname cannot be set to reserved keyword {1}").format(
                    frappe.bold(docname),
                    frappe.bold(fieldname),
                ),
                title=_("Invalid Fieldname"),
            )

        if fieldname in RESERVED_DOCFIELD_NAMES and docname != "DocType":
            frappe.throw(
                _("{0}: fieldname cannot be set to reserved field {1} in DocType").format(
                    frappe.bold(docname),
                    frappe.bold(fieldname),
                ),
                title=_("Invalid Fieldname"),
            )

    def check_unique_fieldname(docname, fieldname):
        duplicates = list(
            filter(None, map(lambda df: (df.fieldname == fieldname and str(df.idx)) or None, fields))
        )
        if len(duplicates) > 1:
            frappe.throw(
                _("{0}: Fieldname {1} appears multiple times in rows {2}").format(
                    docname, fieldname, ", ".join(duplicates)
                ),
                UniqueFieldnameError,
            )

    def check_fieldname_length(fieldname):
        validate_column_length(fieldname)

    def check_illegal_mandatory(docname, d):
        if (d.fieldtype in no_value_fields) and d.fieldtype not in table_fields and d.reqd:
            frappe.throw(
                _("{0}: Field {1} of type {2} cannot be mandatory").format(docname, d.label, d.fieldtype),
                IllegalMandatoryError,
            )

    def check_link_table_options(docname, d):
        if frappe.flags.in_patch or frappe.flags.in_fixtures:
            return

        if d.fieldtype in ("Link", *table_fields):
            if not d.options:
                frappe.throw(
                    _("{0}: Options required for Link or Table type field {1} in row {2}").format(
                        docname, d.label, d.idx
                    ),
                    DoctypeLinkError,
                )
            if d.options == "[Select]" or d.options == d.parent:
                return
            if d.options != d.parent:
                options = frappe.db.get_value("DocType", d.options, "name")
                if not options:
                    frappe.throw(
                        _("{0}: Options must be a valid DocType for field {1} in row {2}").format(
                            docname, d.label, d.idx
                        ),
                        WrongOptionsDoctypeLinkError,
                    )
                elif options != d.options:
                    frappe.throw(
                        _("{0}: Options {1} must be the same as doctype name {2} for the field {3}").format(
                            docname, d.options, options, d.label
                        ),
                        DoctypeLinkError,
                    )
                else:
                    d.options = options

    def check_hidden_and_mandatory(docname, d):
        if d.hidden and d.reqd and not d.default and not frappe.flags.in_migrate:
            frappe.throw(
                _("{0}: Field {1} in row {2} cannot be hidden and mandatory without default").format(
                    docname, d.label, d.idx
                ),
                HiddenAndMandatoryWithoutDefaultError,
            )

    def check_width(d):
        if d.fieldtype == "Currency" and cint(d.width) < 100:
            frappe.throw(_("Max width for type Currency is 100px in row {0}").format(d.idx))

    def check_in_list_view(is_table, d):
        if d.in_list_view and (d.fieldtype in not_allowed_in_list_view):
            property_label = "In Grid View" if is_table else "In List View"
            frappe.throw(
                _("'{0}' not allowed for type {1} in row {2}").format(property_label, d.fieldtype, d.idx)
            )

    def check_in_global_search(d):
        if d.in_global_search and d.fieldtype in no_value_fields:
            frappe.throw(
                _("'In Global Search' not allowed for type {0} in row {1}").format(d.fieldtype, d.idx)
            )

    def check_dynamic_link_options(d):
        if d.fieldtype == "Dynamic Link":
            doctype_pointer = list(filter(lambda df: df.fieldname == d.options, fields))
            if (
                not doctype_pointer
                or (doctype_pointer[0].fieldtype not in ("Link", "Select"))
                or (doctype_pointer[0].fieldtype == "Link" and doctype_pointer[0].options != "DocType")
            ):
                frappe.throw(
                    _(
                        "Options 'Dynamic Link' type of field must point to another Link Field with options as 'DocType'"
                    )
                )

    def check_illegal_default(d):
        if d.fieldtype == "Check" and not d.default:
            d.default = "0"
        if d.fieldtype == "Check":
            default_value = cstr(d.default).strip()
            if default_value not in ("0", "1"):
                frappe.throw(
                    _("The default value for the Check field {0} must be either '0' or '1'").format(
                        frappe.bold(d.label or d.fieldname)
                    )
                )
            d.default = default_value
        if d.fieldtype == "Select" and d.default:
            if not d.options:
                frappe.throw(
                    _("Options for {0} must be set before setting the default value.").format(
                        frappe.bold(d.fieldname)
                    )
                )
            elif d.default not in d.options.split("\n"):
                frappe.throw(
                    _("Default value for {0} must be in the list of options.").format(
                        frappe.bold(d.fieldname)
                    )
                )

    def check_precision(d):
        if (
            d.fieldtype in ("Currency", "Float", "Percent")
            and d.precision is not None
            and not (1 <= cint(d.precision) <= 6)
        ):
            frappe.throw(_("Precision should be between 1 and 6"))

    def check_unique_and_text(docname, d):
        if meta.is_virtual:
            return

        if meta.issingle:
            d.unique = 0
            d.search_index = 0

        if getattr(d, "unique", False):
            if d.fieldtype not in ("Data", "Link", "Read Only", "Int"):
                frappe.throw(
                    _("{0}: Fieldtype {1} for {2} cannot be unique").format(docname, d.fieldtype, d.label),
                    NonUniqueError,
                )

            if not d.get("__islocal") and frappe.db.has_column(d.parent, d.fieldname):
                has_non_unique_values = frappe.db.sql(
                    f"""select `{d.fieldname}`, count(*)
                    from `tab{d.parent}` where ifnull(`{d.fieldname}`, '') != ''
                    group by `{d.fieldname}` having count(*) > 1 limit 1"""
                )

                if has_non_unique_values and has_non_unique_values[0][0]:
                    frappe.throw(
                        _("{0}: Field '{1}' cannot be set as Unique as it has non-unique values").format(
                            docname, d.label
                        ),
                        NonUniqueError,
                    )

        if d.search_index and d.fieldtype in ("Text", "Long Text", "Small Text", "Code", "Text Editor"):
            frappe.throw(
                _("{0}:Fieldtype {1} for {2} cannot be indexed").format(docname, d.fieldtype, d.label),
                CannotIndexedError,
            )

    def check_fold(fields):
        fold_exists = False
        for i, f in enumerate(fields):
            if f.fieldtype == "Fold":
                if fold_exists:
                    frappe.throw(_("There can be only one Fold in a form"))
                fold_exists = True
                if i < len(fields) - 1:
                    nxt = fields[i + 1]
                    if nxt.fieldtype != "Section Break":
                        frappe.throw(_("Fold must come before a Section Break"))
                else:
                    frappe.throw(_("Fold can not be at the end of the form"))

    def check_search_fields(meta, fields):
        """Throw exception if `search_fields` don't contain valid fields."""
        if not meta.search_fields:
            return

        search_fields = [field.strip() for field in (meta.search_fields or "").split(",")]
        fieldtype_mapper = {
            field.fieldname: field.fieldtype
            for field in filter(lambda field: field.fieldname in search_fields, fields)
        }

        for fieldname in search_fields:
            fieldname = fieldname.strip()
            if (fieldtype_mapper.get(fieldname) in no_value_fields) or (fieldname not in fieldname_list):
                frappe.throw(_("Search field {0} is not valid").format(fieldname))

    def check_title_field(meta):
        """Throw exception if `title_field` isn't a valid fieldname."""
        if not meta.get("title_field"):
            return

        if meta.title_field not in fieldname_list:
            frappe.throw(_("Title field must be a valid fieldname"), InvalidFieldNameError)

        def _validate_title_field_pattern(pattern):
            if not pattern:
                return

            for fieldname in FIELD_PATTERN.findall(pattern):
                if fieldname.startswith("{"):
                    continue

                if fieldname not in fieldname_list:
                    frappe.throw(
                        _("{{{0}}} is not a valid fieldname pattern. It should be {{field_name}}.").format(
                            fieldname
                        ),
                        InvalidFieldNameError,
                    )

        df = meta.get("fields", filters={"fieldname": meta.title_field})[0]
        if df:
            _validate_title_field_pattern(df.options)
            _validate_title_field_pattern(df.default)

    def check_image_field(meta):
        '''check image_field exists and is of type "Attach Image"'''
        if not meta.image_field:
            return

        df = meta.get("fields", {"fieldname": meta.image_field})
        if not df:
            frappe.throw(_("Image field must be a valid fieldname"), InvalidFieldNameError)
        if df[0].fieldtype != "Attach Image":
            frappe.throw(_("Image field must be of type Attach Image"), InvalidFieldNameError)

    def check_is_published_field(meta):
        if not meta.is_published_field:
            return

        if meta.is_published_field not in fieldname_list:
            frappe.throw(_("Is Published Field must be a valid fieldname"), InvalidFieldNameError)

    def check_timeline_field(meta):
        if not meta.timeline_field:
            return

        if meta.timeline_field not in fieldname_list:
            frappe.throw(_("Timeline field must be a valid fieldname"), InvalidFieldNameError)

        df = meta.get("fields", {"fieldname": meta.timeline_field})[0]
        if df.fieldtype not in ("Link", "Dynamic Link"):
            frappe.throw(_("Timeline field must be a Link or Dynamic Link"), InvalidFieldNameError)

    def check_sort_field(meta):
        """Validate that sort_field(s) is a valid field"""
        if meta.sort_field:
            sort_fields = [meta.sort_field]
            if "," in meta.sort_field:
                sort_fields = [d.split(maxsplit=1)[0] for d in meta.sort_field.split(",")]

            for fieldname in sort_fields:
                if fieldname not in (fieldname_list + list(default_fields) + list(child_table_fields)):
                    frappe.throw(
                        _("Sort field {0} must be a valid fieldname").format(fieldname), InvalidFieldNameError
                    )

    def check_illegal_depends_on_conditions(docfield):
        """assignment operation should not be allowed in the depends on condition."""
        depends_on_fields = [
            "depends_on",
            "collapsible_depends_on",
            "mandatory_depends_on",
            "read_only_depends_on",
        ]
        for field in depends_on_fields:
            depends_on = docfield.get(field, None)
            if depends_on and ("=" in depends_on) and DEPENDS_ON_PATTERN.match(depends_on):
                frappe.throw(_("Invalid {0} condition").format(frappe.unscrub(field)), frappe.ValidationError)

    def check_table_multiselect_option(docfield):
        """check if the doctype provided in Option has atleast 1 Link field"""
        if docfield.fieldtype != "Table MultiSelect":
            return

        doctype = docfield.options
        meta = frappe.get_meta(doctype)
        link_field = [df for df in meta.fields if df.fieldtype == "Link"]

        if not link_field:
            frappe.throw(
                _(
                    "DocType <b>{0}</b> provided for the field <b>{1}</b> must have atleast one Link field"
                ).format(doctype, docfield.fieldname),
                frappe.ValidationError,
            )

    def scrub_options_in_select(field):
        """Strip options for whitespaces"""

        if field.fieldtype == "Select" and field.options is not None:
            options_list = []
            for i, option in enumerate(field.options.split("\n")):
                _option = option.strip()
                if i == 0 or _option:
                    options_list.append(_option)
            field.options = "\n".join(options_list)

    def validate_fetch_from(field):
        if not field.get("fetch_from"):
            return

        field.fetch_from = field.fetch_from.strip()

        if "." not in field.fetch_from:
            return
        parts = field.fetch_from.split(".", maxsplit=1)
        source_field, _target_field = parts

        if source_field == field.fieldname:
            msg = _(
                "{0} contains an invalid Fetch From expression, Fetch From can't be self-referential."
            ).format(_(field.label, context=field.parent))
            frappe.throw(msg, title=_("Recursive Fetch From"))

    def validate_data_field_type(docfield):
        if docfield.get("is_virtual"):
            return

        if docfield.fieldtype == "Data" and not (docfield.oldfieldtype and docfield.oldfieldtype != "Data"):
            if docfield.options and (docfield.options not in data_field_options):
                df_str = frappe.bold(_(docfield.label, context=docfield.parent))
                text_str = (
                    _("{0} is an invalid Data field.").format(df_str)
                    + "<br>" * 2
                    + _("Only Options allowed for Data field are:")
                    + "<br>"
                )
                df_options_str = "<ul><li>" + "</li><li>".join(_(x) for x in data_field_options) + "</ul>"

                frappe.msgprint(text_str + df_options_str, title="Invalid Data Field", alert=True)

    def check_child_table_option(docfield):
        if frappe.flags.in_fixtures:
            return
        if docfield.fieldtype not in ["Table MultiSelect", "Table"]:
            return

        doctype = docfield.options
        child_doctype_meta = frappe.get_meta(doctype)

        if not child_doctype_meta.istable:
            frappe.throw(
                _("Option {0} for field {1} is not a child table").format(
                    frappe.bold(doctype), frappe.bold(docfield.fieldname)
                ),
                title=_("Invalid Option"),
            )

        if meta.is_virtual and not child_doctype_meta.is_virtual:
            frappe.throw(
                _("Child Table {0} for field {1} must be virtual").format(
                    frappe.bold(doctype), frappe.bold(docfield.fieldname)
                ),
                title=_("Invalid Option"),
            )

        if not meta.is_virtual and child_doctype_meta.is_virtual and not docfield.is_virtual:
            frappe.throw(
                _("Field {0} must be a virtual field to support virtual doctype.").format(
                    frappe.bold(docfield.fieldname)
                ),
                title=_("Virtual tables must be virtual fields"),
            )

    def check_max_height(docfield):
        if getattr(docfield, "max_height", None) and (docfield.max_height[-2:] not in ("px", "em")):
            frappe.throw(f"Max for {frappe.bold(docfield.fieldname)} height must be in px, em, rem")

    def check_no_of_ratings(docfield):
        if docfield.fieldtype == "Rating":
            if docfield.options and (int(docfield.options) > 10 or int(docfield.options) < 3):
                frappe.throw(_("Options for Rating field can range from 3 to 10"))

    def check_decimal_config(docfield):
        if docfield.fieldtype not in ("Currency", "Float", "Percent"):
            return

        if docfield.length and docfield.precision:
            if cint(docfield.precision) > cint(docfield.length):
                frappe.throw(
                    _("Precision ({0}) for {1} cannot be greater than its length ({2}).").format(
                        docfield.precision, frappe.bold(docfield.label), docfield.length
                    )
                )

    def validate_link_filters(docfield):
        link_filters_value = docfield.get("link_filters")
        if not link_filters_value:
            return

        try:
            link_filters = json.loads(link_filters_value)
        except (TypeError, ValueError):
            frappe.throw(
                _("Invalid Filters for field {0}. Filters must be valid JSON.").format(
                    frappe.bold(docfield.label or docfield.fieldname)
                )
            )

        if not isinstance(link_filters, list) or any(
            not isinstance(filter_row, list) or len(filter_row) != 4 for filter_row in link_filters
        ):
            frappe.throw(
                _(
                    "Invalid Filters for field {0}. Filters must be a list of filters, where each filter is a list with four values: doctype, fieldname, operator, and value."
                ).format(frappe.bold(docfield.label or docfield.fieldname))
            )

        if docfield.fieldtype == "Attachment Gallery" and any(
            filter_row[0] != "File" for filter_row in link_filters
        ):
            frappe.throw(_("Attachment Gallery filters must target File."))

    fields = meta.get("fields")
    fieldname_list = [d.fieldname for d in fields]

    in_ci = os.environ.get("CI")

    not_allowed_in_list_view = get_fields_not_allowed_in_list_view(meta)

    for d in fields:
        if not d.permlevel:
            d.permlevel = 0
        if d.fieldtype not in table_fields:
            d.allow_bulk_edit = 0

        check_illegal_characters(d.fieldname)
        check_invalid_fieldnames(meta.get("name"), d.fieldname)
        check_fieldname_length(d.fieldname)
        check_hidden_and_mandatory(meta.get("name"), d)
        check_unique_and_text(meta.get("name"), d)
        check_table_multiselect_option(d)
        scrub_options_in_select(d)
        validate_fetch_from(d)
        validate_data_field_type(d)
        check_decimal_config(d)
        validate_link_filters(d)

        if not frappe.flags.in_migrate or in_ci:
            check_unique_fieldname(meta.get("name"), d.fieldname)
            check_link_table_options(meta.get("name"), d)
            check_illegal_mandatory(meta.get("name"), d)
            check_dynamic_link_options(d)
            check_in_list_view(meta.get("istable"), d)
            check_in_global_search(d)
            check_illegal_depends_on_conditions(d)
            check_illegal_default(d)
            check_child_table_option(d)
            check_max_height(d)
            check_no_of_ratings(d)

    if not frappe.flags.in_migrate or in_ci:
        check_fold(fields)
        check_search_fields(meta, fields)
        check_title_field(meta)
        check_timeline_field(meta)
        check_is_published_field(meta)
        check_sort_field(meta)
        check_image_field(meta)


def get_fields_not_allowed_in_list_view(meta) -> list[str]:
    not_allowed_in_list_view = list(copy.copy(no_value_fields))
    if meta.istable:
        not_allowed_in_list_view.remove("Button")
        not_allowed_in_list_view.remove("HTML")
    return not_allowed_in_list_view


def validate_permissions(doctype, for_remove=False, alert=False):
    permissions = doctype.get("permissions")
    if not permissions and alert:
        frappe.msgprint(_("No Permissions Specified"), alert=True, indicator="orange")
    issingle = issubmittable = isimportable = False
    if doctype:
        issingle = cint(doctype.issingle)
        issubmittable = cint(doctype.is_submittable)
        isimportable = cint(doctype.allow_import)

    def get_txt(d):
        return _("For {0} at level {1} in {2} in row {3}").format(d.role, d.permlevel, d.parent, d.idx)

    def check_atleast_one_set(d):
        if not d.select and not d.read and not d.write and not d.submit and not d.cancel and not d.create:
            frappe.throw(_("{0}: No basic permissions set").format(get_txt(d)))

    def check_double(d):
        has_similar = False
        similar_because_of = ""
        for p in permissions:
            if p.role == d.role and p.permlevel == d.permlevel and p != d:
                if p.if_owner == d.if_owner:
                    similar_because_of = _("If Owner")
                    has_similar = True
                    break

        if has_similar:
            frappe.throw(
                _("{0}: Only one rule allowed with the same Role, Level and {1}").format(
                    get_txt(d), similar_because_of
                )
            )

    def check_level_zero_is_set(d):
        if cint(d.permlevel) > 0 and d.role not in (ALL_USER_ROLE, SYSTEM_USER_ROLE):
            has_zero_perm = False
            for p in permissions:
                if p.role == d.role and (p.permlevel or 0) == 0 and p != d:
                    has_zero_perm = True
                    break

            if not has_zero_perm:
                frappe.throw(
                    _("{0}: Permission at level 0 must be set before higher levels are set").format(
                        get_txt(d)
                    )
                )

            for invalid in ("create", "submit", "cancel", "amend"):
                if d.get(invalid):
                    d.set(invalid, 0)

    def check_permission_dependency(d):
        if d.cancel and not d.submit:
            frappe.throw(
                _("{0}: The 'Cancel' permission cannot be granted without the 'Submit' permission.").format(
                    get_txt(d)
                )
            )

        if (d.submit or d.cancel or d.amend) and not d.write:
            frappe.throw(
                _(
                    "{0}: The 'Submit', 'Cancel', and 'Amend' permissions cannot be granted without the 'Write' permission."
                ).format(get_txt(d))
            )
        if d.amend and not d.create:
            frappe.throw(
                _("{0}: The 'Amend' permission cannot be granted without the 'Create' permission.").format(
                    get_txt(d)
                )
            )
        if d.get("import") and not d.create:
            frappe.throw(
                _("{0}: The 'Import' permission cannot be granted without the 'Create' permission.").format(
                    get_txt(d)
                )
            )

    def remove_rights_for_single(d):
        if not issingle:
            return

        if d.get("report"):
            d.set("report", 0)
            frappe.msgprint(
                _(
                    "{0}: The 'Report' permission was removed because it cannot be granted for a 'single' DocType."
                ).format(get_txt(d))
            )

        if d.get("import"):
            d.set("import", 0)
            frappe.msgprint(
                _(
                    "{0}: The 'Import' permission was removed because it cannot be granted for a 'single' DocType."
                ).format(get_txt(d))
            )

        if d.get("export"):
            d.set("export", 0)
            frappe.msgprint(
                _(
                    "{0}: The 'Export' permission was removed because it cannot be granted for a 'single' DocType."
                ).format(get_txt(d))
            )

    def check_if_submittable(d):
        if issubmittable:
            return

        if d.submit:
            frappe.throw(
                _("{0}: The 'Submit' permission cannot be granted for a non-submittable DocType.").format(
                    get_txt(d)
                )
            )

        if d.amend:
            frappe.throw(
                _("{0}: The 'Amend' permission cannot be granted for a non-submittable DocType.").format(
                    get_txt(d)
                )
            )

    def check_if_importable(d):
        if d.get("import") and not isimportable:
            frappe.throw(
                _("{0}: The 'Import' permission cannot be granted for a non-importable DocType.").format(
                    get_txt(d)
                )
            )

    def validate_permission_for_all_role(d):
        if frappe.session.user == "Administrator":
            return

        if doctype.custom:
            if d.role in AUTOMATIC_ROLES:
                frappe.throw(
                    _(
                        "Row # {0}: Non-administrator users cannot add the role {1} to a custom DocType."
                    ).format(d.idx, frappe.bold(_(d.role))),
                    title=_("Permissions Error"),
                )

            roles = [row.name for row in frappe.get_all("Role", filters={"is_custom": 1})]

            if d.role in roles:
                frappe.throw(
                    _(
                        "Row # {0}: Non-administrator users cannot add the role {1} to a custom DocType."
                    ).format(d.idx, frappe.bold(_(d.role))),
                    title=_("Permissions Error"),
                )

    for d in permissions:
        if cint(d.permlevel) > 0 and d.if_owner:
            d.if_owner = 0

    seen = []
    deduped = []
    for d in permissions:
        comparable = d.as_dict(no_default_fields=True)
        comparable.pop("name", None)
        if comparable in seen:
            continue
        seen.append(comparable)
        deduped.append(d)

    if len(deduped) != len(permissions):
        doctype.set("permissions", deduped)
        permissions = doctype.get("permissions")

    for d in permissions:
        if not d.permlevel:
            d.permlevel = 0
        check_atleast_one_set(d)
        if not for_remove:
            check_double(d)
            check_permission_dependency(d)
            check_if_submittable(d)
            check_if_importable(d)
        check_level_zero_is_set(d)
        remove_rights_for_single(d)
        validate_permission_for_all_role(d)


def make_module_and_roles(doc, perm_fieldname="permissions"):
    """Make `Module Def` and `Role` records if already not made. Called while installing."""
    try:
        if (
            hasattr(doc, "restrict_to_domain")
            and doc.restrict_to_domain
            and not frappe.db.exists("Domain", doc.restrict_to_domain)
        ):
            frappe.get_doc(doctype="Domain", domain=doc.restrict_to_domain).insert()

        if "tabModule Def" in frappe.db.get_tables():
            from frappe.installer import reclaim_module_name_for_its_app

            reclaim_module_name_for_its_app(doc.module)

            if not frappe.db.exists("Module Def", doc.module):
                m = frappe.get_doc({"doctype": "Module Def", "module_name": doc.module})
                if frappe.scrub(doc.module) in frappe.local.module_app:
                    m.app_name = frappe.local.module_app[frappe.scrub(doc.module)]
                else:
                    m.app_name = "frappe"
                m.flags.ignore_mandatory = m.flags.ignore_permissions = True
                if frappe.flags.package:
                    m.package = frappe.flags.package.name
                    m.custom = 1
                m.insert()

        roles = [p.role for p in doc.get("permissions") or []] + list(AUTOMATIC_ROLES)

        for role in list(set(roles)):
            if frappe.db.table_exists("Role", cached=False) and not frappe.db.exists("Role", role):
                r = frappe.new_doc("Role")
                r.role_name = role
                r.desk_access = 1
                r.flags.ignore_mandatory = r.flags.ignore_permissions = True
                r.insert()
    except frappe.DoesNotExistError:
        pass
    except frappe.db.ProgrammingError as e:
        if frappe.db.is_table_missing(e):
            pass
        else:
            raise


def check_fieldname_conflicts(docfield):
    """Checks if fieldname conflicts with methods or properties"""
    doc = frappe.get_doc({"doctype": docfield.dt})
    available_objects = [x for x in dir(doc) if isinstance(x, str) and x != "docs"]
    property_list = [x for x in available_objects if is_a_property(getattr(type(doc), x, None))]
    method_list = [x for x in available_objects if x not in property_list and callable(getattr(doc, x))]
    msg = _("Fieldname {0} conflicting with meta object").format(docfield.fieldname)

    if docfield.fieldname in method_list + property_list:
        frappe.msgprint(msg, raise_exception=not docfield.is_virtual)


def clear_linked_doctype_cache():
    frappe.cache.delete_value("linked_doctypes_without_ignore_user_permissions_enabled")


def check_email_append_to(doc):
    if not hasattr(doc, "email_append_to") or not doc.email_append_to:
        return

    doc.subject_field = doc.subject_field.strip() if doc.subject_field else None
    subject_field = get_field(doc, doc.subject_field)

    if doc.subject_field and not subject_field:
        frappe.throw(_("Select a valid Subject field for creating documents from Email"))

    if subject_field and subject_field.fieldtype not in [
        "Data",
        "Text",
        "Long Text",
        "Small Text",
        "Text Editor",
    ]:
        frappe.throw(_("Subject Field type should be Data, Text, Long Text, Small Text, Text Editor"))

    doc.sender_field = doc.sender_field.strip() if doc.sender_field else None
    sender_field = get_field(doc, doc.sender_field)

    if doc.sender_field and not sender_field:
        frappe.throw(_("Select a valid Sender Field for creating documents from Email"))

    if sender_field.options != "Email":
        frappe.throw(_("Sender Field should have Email in options"))


def get_field(doc, fieldname):
    if not (doc or fieldname):
        return

    for field in doc.fields:
        if field.fieldname == fieldname:
            return field


@frappe.whitelist()
def get_row_size_utilization(doctype: str) -> float:
    """Get row size utilization in percentage"""

    frappe.has_permission("DocType", throw=True)
    try:
        return flt(frappe.db.get_row_size(doctype) / frappe.db.MAX_ROW_SIZE_LIMIT * 100, 2)
    except Exception:
        return 0.0


DEPENDS_ON_PATTERN = re.compile(r'[\w\.:_]+\s*={1}\s*[\w\.@\'"]+')
FIELD_PATTERN = re.compile("{(.*?)}", flags=re.UNICODE)


def validate_permissions_for_doctype(doctype, for_remove=False, alert=False):
    """Validates if permissions are set correctly."""
    doctype = frappe.get_doc("DocType", doctype)
    validate_permissions(doctype, for_remove, alert=alert)

    for perm in doctype.get("permissions"):
        perm.db_update()

    clear_permissions_cache(doctype.name)
