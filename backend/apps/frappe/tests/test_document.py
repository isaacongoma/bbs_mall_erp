from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.frappe import exceptions
from apps.frappe.models import HasRole
from apps.frappe.runtime import get_doc, new_doc, session, local as frappe_local
from apps.erpnext.registry import get_model
from apps.erpnext.tests.meta_patch import meta_for

User = get_user_model()


class DocumentLifecycleTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        frappe_local.flags.ignore_chart_of_accounts = True
        self.doc = new_doc("Branch")
        self.doc.branch = "Test Branch"
        self.doc.insert()

    def test_stale_document_save_fails(self):
        doc1 = get_doc("Branch", self.doc.name)
        doc2 = get_doc("Branch", self.doc.name)
        
        doc1.branch = "Changed 1"
        doc1.save()
        
        doc2.branch = "Changed 2"
        with self.assertRaises(exceptions.TimestampMismatchError):
            doc2.save()

    def test_submit_cancel_pipeline(self):
        doc = get_doc("Branch", self.doc.name)
        calls = []
        original_run_method = doc.run_method
        def fake_run_method(method, *args, **kwargs):
            calls.append(method)
            return original_run_method(method, *args, **kwargs)
        
        doc.run_method = fake_run_method

        from apps.erpnext.registry import get_meta
        meta = get_meta("Branch")
        original_submittable = meta.get("is_submittable")
        meta["is_submittable"] = 1

        doc.submit()
        self.assertLess(calls.index("before_submit"), calls.index("on_submit"))
        self.assertLess(calls.index("on_submit"), calls.index("on_change"))
        self.assertEqual(get_model("Branch").objects.get(pk=doc.name).docstatus, 1)

        calls.clear()
        doc.cancel()
        self.assertLess(calls.index("before_cancel"), calls.index("on_cancel"))
        self.assertLess(calls.index("on_cancel"), calls.index("on_change"))
        self.assertEqual(get_model("Branch").objects.get(pk=doc.name).docstatus, 2)
        
        if original_submittable is None:
            del meta["is_submittable"]
        else:
            meta["is_submittable"] = original_submittable

    def test_copy_doc_returns_correct_instance(self):
        doc = get_doc("Branch", self.doc.name)
        doc.docstatus = 1
        doc.amended_from = "Something"
        
        copied = doc.copy_doc()
        self.assertEqual(copied.doctype, "Branch")
        self.assertEqual(copied.docstatus, 0)
        self.assertIsNone(copied.amended_from)
        self.assertIsNone(copied.name)
        self.assertEqual(copied.branch, "Test Branch")
        self.assertIsInstance(copied, type(doc))

    def test_get_doc_before_save_does_not_swallow_exceptions(self):
        doc = new_doc("Branch")
        doc.name = "Does Not Exist"
        self.assertIsNone(doc.load_doc_before_save())
        self.assertIsNone(doc.get_doc_before_save())

        doc.doctype = "Non Existent Doctype"
        with self.assertRaises(LookupError):
            doc.load_doc_before_save()

    def test_cancel_does_not_persist_when_before_cancel_fails(self):
        doc = get_doc("Branch", self.doc.name)
        from apps.erpnext.registry import get_meta

        meta = get_meta("Branch")
        original_submittable = meta.get("is_submittable")
        meta["is_submittable"] = 1
        doc.submit()
        original_run_method = doc.run_method

        def fail_before_cancel(method, *args, **kwargs):
            if method == "before_cancel":
                raise exceptions.ValidationError("stop cancel")
            return original_run_method(method, *args, **kwargs)

        doc.run_method = fail_before_cancel
        with self.assertRaises(exceptions.ValidationError):
            doc.cancel()
        self.assertEqual(get_model("Branch").objects.get(pk=doc.name).docstatus, 1)
        if original_submittable is None:
            del meta["is_submittable"]
        else:
            meta["is_submittable"] = original_submittable

    def test_higher_permlevel_resets_field_without_write_access(self):
        user = User.objects.create_user(
            username="perm-reset-user",
            email="perm-reset-user@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="perm-reset-user-hr", parent=user.email, role="HR User")
        session.user = user.email
        doc = get_doc("Branch", self.doc.name)
        meta = {
            "fields": [{"fieldname": "branch", "fieldtype": "Data", "permlevel": 1}],
            "permissions": [{"role": "HR User", "read": 1, "write": 1, "permlevel": 0}],
            "module": "Setup",
        }
        doc.branch = "Not Allowed"
        with patch("apps.frappe.permissions.has_permission", return_value=True):
            with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Branch", meta)):
                doc.save()
        self.assertEqual(get_model("Branch").objects.get(pk=doc.name).branch, "Test Branch")

        doc = get_doc("Branch", self.doc.name)
        meta["permissions"].append({"role": "HR User", "read": 1, "write": 1, "permlevel": 1})
        doc.branch = "Allowed"
        with patch("apps.frappe.permissions.has_permission", return_value=True):
            with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Branch", meta)):
                doc.save()
        self.assertEqual(get_model("Branch").objects.get(pk=doc.name).branch, "Allowed")
        session.user = "Administrator"

    def test_delete_is_blocked_when_another_document_links_here(self):
        holiday_list = new_doc("Holiday List")
        holiday_list.holiday_list_name = "Linked HL"
        holiday_list.from_date = "2024-01-01"
        holiday_list.to_date = "2024-12-31"
        holiday_list.insert()
        company = new_doc("Company")
        company.company_name = "Linked Company"
        company.abbr = "LC"
        company.default_holiday_list = holiday_list.name
        company.insert(ignore_mandatory=True, ignore_links=True)
        with self.assertRaises(exceptions.LinkExistsError):
            holiday_list.delete()
        self.assertTrue(get_model("Holiday List").objects.filter(pk=holiday_list.name).exists())
