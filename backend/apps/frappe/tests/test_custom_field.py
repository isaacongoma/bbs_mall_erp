from django.test import TestCase

import frappe
from apps.erpnext.registry import get_meta, get_model
from apps.frappe import exceptions
from apps.frappe.custom.doctype.custom_field.custom_field import (
    CustomField,
    create_custom_field,
    create_custom_fields,
)
from apps.frappe.runtime import get_doc, new_doc, session


def meta_fields(doctype):
    return [f["fieldname"] for f in get_meta(doctype)["fields"]]


class CustomFieldTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_label_generates_fieldname_and_name(self):
        field = create_custom_field("Branch", {"label": "KRA PIN", "fieldtype": "Data"})
        self.assertEqual(field.fieldname, "kra_pin")
        self.assertEqual(field.name, "Branch-kra_pin")
        self.assertIsInstance(get_doc("Custom Field", field.name), CustomField)

    def test_field_appears_in_meta_after_anchor(self):
        create_custom_field("Branch", {"fieldname": "custom_code", "label": "Code", "fieldtype": "Data", "insert_after": "branch"})
        names = meta_fields("Branch")
        self.assertEqual(names[names.index("branch") + 1], "custom_code")

    def test_column_is_created_and_values_persist(self):
        create_custom_field("Branch", {"fieldname": "custom_pin", "label": "PIN", "fieldtype": "Data"})
        self.assertIn("custom_pin", frappe.db.get_table_columns("Branch"))
        doc = new_doc("Branch")
        doc.branch = "CF Branch"
        doc.custom_pin = "A123456789Z"
        doc.insert()
        reloaded = get_doc("Branch", "CF Branch")
        self.assertEqual(reloaded.custom_pin, "A123456789Z")
        self.assertEqual(get_model("Branch").objects.get(pk="CF Branch").custom_pin, "A123456789Z")

    def test_typed_custom_fields(self):
        create_custom_fields(
            {
                "Branch": [
                    {"fieldname": "custom_limit", "label": "Limit", "fieldtype": "Currency"},
                    {"fieldname": "custom_active", "label": "Active", "fieldtype": "Check", "default": "1"},
                    {"fieldname": "custom_opened", "label": "Opened", "fieldtype": "Date"},
                    {"fieldname": "custom_notes", "label": "Notes", "fieldtype": "Small Text"},
                    {"fieldname": "custom_section", "label": "Extra", "fieldtype": "Section Break"},
                ]
            }
        )
        doc = new_doc("Branch")
        doc.branch = "Typed Branch"
        doc.custom_limit = 1500.5
        doc.custom_opened = "2024-02-03"
        doc.custom_notes = "hello"
        doc.insert()
        row = get_model("Branch").objects.get(pk="Typed Branch")
        self.assertEqual(float(row.custom_limit), 1500.5)
        self.assertEqual(row.custom_active, 1)
        self.assertEqual(str(row.custom_opened), "2024-02-03")
        self.assertFalse(hasattr(row, "custom_section"))
        self.assertIn("custom_section", meta_fields("Branch"))

    def test_duplicate_fieldname_is_rejected(self):
        create_custom_field("Branch", {"fieldname": "custom_dup", "label": "Dup", "fieldtype": "Data"})
        doc = frappe.get_doc({"doctype": "Custom Field", "dt": "Branch", "fieldname": "custom_dup", "label": "Dup", "fieldtype": "Data"})
        with self.assertRaises(exceptions.ValidationError):
            doc.insert()

    def test_restricted_fieldnames_are_suffixed(self):
        field = create_custom_field("Branch", {"fieldname": "modified", "label": "Modified", "fieldtype": "Data"})
        self.assertEqual(field.fieldname, "modified1")

    def test_create_custom_fields_updates_existing(self):
        spec = {"Branch": [{"fieldname": "custom_u", "label": "One", "fieldtype": "Data"}]}
        create_custom_fields(spec)
        spec["Branch"][0]["label"] = "Two"
        create_custom_fields(spec)
        self.assertEqual(get_doc("Custom Field", "Branch-custom_u").label, "Two")
        self.assertEqual(frappe.db.count("Custom Field", {"dt": "Branch", "fieldname": "custom_u"}), 1)
        create_custom_fields({"Branch": [{"fieldname": "custom_u", "label": "Three", "fieldtype": "Data"}]}, update=False)
        self.assertEqual(get_doc("Custom Field", "Branch-custom_u").label, "Two")

    def test_delete_removes_field_from_meta(self):
        field = create_custom_field("Branch", {"fieldname": "custom_gone", "label": "Gone", "fieldtype": "Data"})
        self.assertIn("custom_gone", meta_fields("Branch"))
        frappe.delete_doc("Custom Field", field.name)
        self.assertNotIn("custom_gone", meta_fields("Branch"))
        get_model("Branch")
        self.assertNotIn("custom_gone", [f.name for f in get_model("Branch")._meta.fields])

    def test_rollback_removes_dynamic_field(self):
        from django.db import transaction

        try:
            with transaction.atomic():
                create_custom_field("Branch", {"fieldname": "custom_tmp", "label": "Tmp", "fieldtype": "Data"})
                self.assertIn("custom_tmp", [f.name for f in get_model("Branch")._meta.fields])
                raise RuntimeError("rollback")
        except RuntimeError:
            pass
        self.assertNotIn("custom_tmp", [f.name for f in get_model("Branch")._meta.fields])
        self.assertNotIn("custom_tmp", meta_fields("Branch"))

    def test_property_setter_applies_to_custom_field(self):
        from apps.frappe.custom.doctype.property_setter.property_setter import make_property_setter

        create_custom_field("Branch", {"fieldname": "custom_ps", "label": "PS", "fieldtype": "Data"})
        make_property_setter("Branch", "custom_ps", "hidden", 1, "Check", validate_fields_for_doctype=False)
        field = next(f for f in get_meta("Branch")["fields"] if f["fieldname"] == "custom_ps")
        self.assertEqual(field["hidden"], 1)
        self.assertEqual(field["is_custom_field"], 1)

    def test_custom_field_validation_runs_on_documents(self):
        create_custom_field("Branch", {"fieldname": "custom_req", "label": "Req", "fieldtype": "Data", "reqd": 1})
        doc = new_doc("Branch")
        doc.branch = "Req Branch"
        with self.assertRaises(exceptions.MandatoryError):
            doc.insert()
        doc.custom_req = "x"
        doc.insert()
