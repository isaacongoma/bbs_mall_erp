from django.test import TestCase

import frappe
from apps.erpnext.registry import get_meta
from apps.frappe import exceptions
from apps.frappe.custom.doctype.property_setter.property_setter import (
    PropertySetter,
    delete_property_setter,
    make_property_setter,
)
from apps.frappe.runtime import get_doc, session


def field(doctype, fieldname):
    return next(f for f in get_meta(doctype)["fields"] if f.get("fieldname") == fieldname)


class PropertySetterTests(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_make_property_setter_overrides_meta(self):
        self.assertFalse(field("Branch", "branch").get("hidden"))
        make_property_setter("Branch", "branch", "hidden", 1, "Check", validate_fields_for_doctype=False)
        self.assertEqual(field("Branch", "branch")["hidden"], 1)
        self.assertEqual(get_doc("Property Setter", "Branch-branch-hidden").value, "1")

    def test_name_and_class(self):
        doc = make_property_setter("Branch", "branch", "label", "Branch Name", "Data", validate_fields_for_doctype=False)
        self.assertEqual(doc.name, "Branch-branch-label")
        self.assertIsInstance(get_doc("Property Setter", doc.name), PropertySetter)
        self.assertEqual(field("Branch", "branch")["label"], "Branch Name")

    def test_replacing_existing_setter_keeps_a_single_row(self):
        make_property_setter("Branch", "branch", "hidden", 1, "Check", validate_fields_for_doctype=False)
        make_property_setter("Branch", "branch", "hidden", 0, "Check", validate_fields_for_doctype=False)
        rows = frappe.get_all("Property Setter", filters={"doc_type": "Branch", "property": "hidden"}, fields=["name", "value"])
        self.assertEqual(len(rows), 1)
        self.assertEqual(field("Branch", "branch")["hidden"], 0)

    def test_doctype_level_property(self):
        make_property_setter("Branch", None, "max_attachments", 3, "Int", for_doctype=True, validate_fields_for_doctype=False)
        self.assertEqual(get_meta("Branch")["max_attachments"], 3)

    def test_delete_restores_original_meta(self):
        original = field("Branch", "branch").get("hidden")
        make_property_setter("Branch", "branch", "hidden", 1, "Check", validate_fields_for_doctype=False)
        delete_property_setter("Branch", "hidden", "branch")
        self.assertEqual(field("Branch", "branch").get("hidden"), original)

    def test_fieldtype_change_is_blocked_for_naming_series(self):
        with self.assertRaises(exceptions.ValidationError):
            make_property_setter("Branch", "naming_series", "fieldtype", "Data", "Data", validate_fields_for_doctype=False)

    def test_original_meta_is_never_mutated(self):
        from apps.erpnext.registry import _meta_by_doctype

        make_property_setter("Branch", "branch", "hidden", 1, "Check", validate_fields_for_doctype=False)
        get_meta("Branch")
        base = next(f for f in _meta_by_doctype()["Branch"]["fields"] if f["fieldname"] == "branch")
        self.assertFalse(base.get("hidden"))

    def test_rollback_does_not_leave_stale_overlay(self):
        from django.db import transaction

        try:
            with transaction.atomic():
                make_property_setter("Branch", "branch", "hidden", 1, "Check", validate_fields_for_doctype=False)
                self.assertEqual(field("Branch", "branch")["hidden"], 1)
                raise RuntimeError("rollback")
        except RuntimeError:
            pass
        self.assertFalse(field("Branch", "branch").get("hidden"))
