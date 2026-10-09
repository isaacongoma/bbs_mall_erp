from frappe.model import core_doctypes_list
from frappe.query_builder import Field, functions
import frappe
from frappe import _
from apps.frappe.custom.doctype.property_setter.property_setter import delete_property_setter
from apps.frappe.database import savepoint
from apps.frappe.model.document import Document
from apps.frappe.utils import cstr
from apps.frappe.utils.data import generate_hash


class CustomField(Document):
    doctype = "Custom Field"

    def autoname(self):
        self.set_fieldname()
        self.name = self.dt + "-" + self.fieldname

    def set_fieldname(self):
        restricted = (
            "name",
            "parent",
            "creation",
            "modified",
            "modified_by",
            "parentfield",
            "parenttype",
            "file_list",
            "flags",
            "docstatus",
        )
        if not self.fieldname:
            label = self.label
            if not label:
                if self.fieldtype in ["Section Break", "Column Break", "Tab Break"]:
                    label = self.fieldtype + "_" + str(generate_hash(length=5))
                else:
                    frappe.throw(_("Label is mandatory"))

            self.fieldname = "".join(
                [c for c in cstr(label).replace(" ", "_") if c.isdigit() or c.isalpha() or c == "_"]
            )
            self.fieldname = f"custom_{self.fieldname}"

        self.fieldname = self.fieldname.lower()

        if self.fieldname in restricted:
            self.fieldname = self.fieldname + "1"

    def before_insert(self):
        self.set_fieldname()

    def validate(self):
        if self.is_new() or self.insert_after == "append":
            meta = frappe.get_meta(self.dt)
            fieldnames = [df.get("fieldname") for df in meta.get("fields")]

            if self.is_new() and self.fieldname in fieldnames:
                frappe.throw(
                    _("A field with the name {0} already exists in {1}").format(
                        frappe.bold(self.fieldname), self.dt
                    )
                )

            if self.insert_after == "append":
                self.insert_after = fieldnames[-1]

            if self.insert_after and self.insert_after in fieldnames:
                self.idx = fieldnames.index(self.insert_after) + 1

        if not self.fieldname:
            frappe.throw(_("Fieldname not set for Custom Field"))

    def on_update(self):
        if not frappe.flags.in_create_custom_fields:
            frappe.clear_cache(doctype=self.dt)
            frappe.db.updatedb(self.dt)

    def on_trash(self):
        if self.owner == "Administrator" and frappe.session.user != "Administrator":
            frappe.throw(
                _(
                    "Custom Field {0} is created by the Administrator and can only be deleted through the Administrator account."
                ).format(frappe.bold(self.label))
            )

        delete_property_setter(self.dt, field_name=self.fieldname)
        frappe.clear_cache(doctype=self.dt)

    def validate_insert_after(self, meta):
        if not meta.get_field(self.insert_after):
            frappe.throw(
                _(
                    "Insert After field '{0}' mentioned in Custom Field '{1}', with label '{2}', does not exist"
                ).format(self.insert_after, self.name, self.label),
                frappe.DoesNotExistError,
            )

        if self.fieldname == self.insert_after:
            frappe.throw(
                _("Insert After cannot be set as {0}").format(meta.get_translated_label(self.insert_after))
            )


def create_custom_field(doctype, df, ignore_validate=False, is_system_generated=True):
    df = frappe._dict(df)
    if not df.fieldname and df.label:
        df.fieldname = frappe.scrub(df.label)
    if not frappe.db.get_value("Custom Field", {"dt": doctype, "fieldname": df.fieldname}):
        custom_field = frappe.get_doc(
            {
                "doctype": "Custom Field",
                "dt": doctype,
                "permlevel": 0,
                "fieldtype": "Data",
                "hidden": 0,
                "is_system_generated": is_system_generated,
            }
        )
        custom_field.update(df)
        custom_field.flags.ignore_validate = ignore_validate
        custom_field.insert()
        return custom_field


def get_existing_custom_fields(custom_fields):
    doctypes_to_fetch = set()
    for doctypes in custom_fields:
        if isinstance(doctypes, str):
            doctypes = (doctypes,)

        for doctype in doctypes:
            doctypes_to_fetch.add(doctype)

    existing_fields = frappe.get_all("Custom Field", filters={"dt": ("in", doctypes_to_fetch)}, fields="*")
    return {(field.dt, field.fieldname): field for field in existing_fields}


@frappe.whitelist()
def get_fields_label(doctype: str | None = None):
    meta = frappe.get_meta(doctype)

    if doctype in core_doctypes_list:
        return frappe.msgprint(_("Custom Fields cannot be added to core DocTypes."))

    if meta.custom:
        return frappe.msgprint(_("Custom Fields can only be added to a standard DocType."))

    return [
        {"value": df.fieldname or "", "label": _(df.label, context=df.parent) if df.label else ""}
        for df in frappe.get_meta(doctype).get("fields")
    ]


@frappe.whitelist(methods=["POST"])
def rename_fieldname(custom_field: str, fieldname: str):
    frappe.only_for("System Manager")

    field: CustomField = frappe.get_doc("Custom Field", custom_field)
    parent_doctype = field.dt
    old_fieldname = field.fieldname
    field.fieldname = fieldname
    field.set_fieldname()
    new_fieldname = field.fieldname

    if field.is_system_generated:
        frappe.throw(_("System Generated Fields can not be renamed"))
    if frappe.db.has_column(parent_doctype, fieldname):
        frappe.throw(_("Can not rename as column {0} is already present on DocType.").format(fieldname))
    if old_fieldname == new_fieldname:
        frappe.msgprint(_("Old and new fieldnames are same."), alert=True)
        return

    if frappe.db.has_column(field.dt, old_fieldname):
        frappe.db.rename_column(parent_doctype, old_fieldname, new_fieldname)

    field.db_set("fieldname", field.fieldname, notify=True)
    _update_fieldname_references(field, old_fieldname, new_fieldname)

    frappe.msgprint(_("Custom field renamed to {0} successfully.").format(fieldname), alert=True)
    frappe.db.commit()
    frappe.clear_cache()


def _update_fieldname_references(field: CustomField, old_fieldname: str, new_fieldname: str) -> None:
    if field.fieldtype == "Password":
        Auth = frappe.qb.Table("__Auth")
        frappe.qb.update(Auth).set(Auth.fieldname, new_fieldname).where(
            (Auth.doctype == field.dt) & (Auth.fieldname == old_fieldname)
        ).run()

    frappe.db.set_value(
        "Custom Field",
        {"insert_after": old_fieldname, "dt": field.dt},
        "insert_after",
        new_fieldname,
    )


def delete_custom_fields(custom_fields: dict, bypass_hooks: bool = False):
    """
    Delete custom fields from doctypes.

    :param custom_fields: Dict mapping doctype to field names.
    :param bypass_hooks: If `True`, fast raw delete (skips hooks (doc events like on_trash)).

    Example:

    ```
    delete_custom_fields({"Address": ["custom_a", "custom_b"]})

    delete_custom_fields({"ToDo": [{"fieldname": "cf_1"}]}, bypass_hooks=True)
    ````
    """
    for doctype, fields in custom_fields.items():
        fieldnames = []

        if isinstance(fields, (list, tuple, set)):
            for field in fields:
                if isinstance(field, str):
                    fieldnames.append(field)
                elif isinstance(field, dict) and field.get("fieldname"):
                    fieldnames.append(field["fieldname"])

        if not fieldnames:
            continue

        fieldnames = tuple(set(fieldnames))

        if bypass_hooks:
            frappe.db.delete(
                "Custom Field",
                {
                    "fieldname": ("in", fieldnames),
                    "dt": doctype,
                },
            )
            frappe.clear_cache(doctype=doctype)
        else:
            custom_field_names = frappe.get_all(
                "Custom Field",
                filters={"fieldname": ("in", fieldnames), "dt": doctype},
                pluck="name",
            )

            for custom_field_name in custom_field_names:
                frappe.get_doc("Custom Field", custom_field_name).delete(ignore_permissions=True, force=True)


def create_custom_field_if_values_exist(doctype, df):
    df = frappe._dict(df)
    if df.fieldname in frappe.db.get_table_columns(doctype) and frappe.db.count(
        dt=doctype, filters=functions.IfNull(Field(df.fieldname), "") != ""
    ):
        create_custom_field(doctype, df)


def create_custom_fields(custom_fields: dict, ignore_validate=False, update=True):
    """Add / update multiple custom fields

    :param custom_fields: example `{'Sales Invoice': [dict(fieldname='test')]}`"""

    def process_field_update(field):
        nonlocal updated

        updated = True

        existing_custom_fields[(field.dt, field.fieldname)] = field.__dict__

    try:
        frappe.flags.in_create_custom_fields = True
        doctypes_to_update = set()

        if frappe.flags.in_setup_wizard:
            ignore_validate = True

        existing_custom_fields = get_existing_custom_fields(custom_fields)

        for doctypes, fields in custom_fields.items():
            if isinstance(fields, dict):
                fields = (fields,)

            if isinstance(doctypes, str):
                doctypes = (doctypes,)

            for doctype in doctypes:
                updated = False

                for df in fields:
                    field = existing_custom_fields.get((doctype, df["fieldname"]))
                    if not field:
                        with savepoint(catch=frappe.exceptions.DuplicateEntryError):
                            df = df.copy()
                            df["owner"] = "Administrator"
                            custom_field = create_custom_field(doctype, df, ignore_validate=ignore_validate)
                            process_field_update(custom_field)

                    elif update:
                        custom_field = frappe.get_doc({"doctype": "Custom Field", **field})
                        original_values = custom_field.__dict__.copy()
                        custom_field.update(df)

                        if original_values != custom_field.__dict__:
                            if ignore_validate:
                                custom_field.flags.ignore_validate = True

                            custom_field.save()
                            process_field_update(custom_field)

                if updated:
                    doctypes_to_update.add(doctype)

        for doctype in doctypes_to_update:
            frappe.clear_cache(doctype=doctype)
            frappe.db.updatedb(doctype)

    finally:
        frappe.flags.in_create_custom_fields = False
