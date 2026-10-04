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


def create_custom_field_if_values_exist(doctype, df):
    df = frappe._dict(df)
    if df.fieldname in frappe.db.get_table_columns(doctype) and frappe.db.count(
        doctype, filters=[[df.fieldname, "is", "set"]]
    ):
        create_custom_field(doctype, df)


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


def create_custom_fields(custom_fields: dict, ignore_validate=False, update=True):
    def process_field_update(field):
        nonlocal updated

        updated = True

        existing_custom_fields[(field.dt, field.fieldname)] = field.as_dict()

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
                            if custom_field:
                                process_field_update(custom_field)

                    elif update:
                        custom_field = frappe.get_doc({"doctype": "Custom Field", **field})
                        original_values = custom_field.as_dict()
                        custom_field.update(df)

                        if original_values != custom_field.as_dict():
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


def get_existing_custom_fields(custom_fields):
    doctypes_to_fetch = set()
    for doctypes in custom_fields:
        if isinstance(doctypes, str):
            doctypes = (doctypes,)

        for doctype in doctypes:
            doctypes_to_fetch.add(doctype)

    existing_fields = frappe.get_all("Custom Field", filters={"dt": ("in", doctypes_to_fetch)}, fields="*")
    return {(field.dt, field.fieldname): field for field in existing_fields}
