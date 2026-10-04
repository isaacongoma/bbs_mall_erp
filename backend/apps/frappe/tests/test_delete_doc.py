from unittest.mock import patch

from django.test import TestCase

from apps.erpnext.registry import get_meta, get_model
from apps.frappe import exceptions
from apps.frappe.model.delete_doc import check_if_doc_is_dynamically_linked
from apps.frappe.runtime import _dict, delete_doc, get_doc, new_doc, resolve_model, session, local as frappe_local


class DeleteDocTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        frappe_local.flags.ignore_chart_of_accounts = True
        self.branch = new_doc("Branch")
        self.branch.branch = "Delete Doc Branch"
        self.branch.insert()

    def _linked_holiday_list(self, name, abbr):
        holiday_list = new_doc("Holiday List")
        holiday_list.holiday_list_name = name
        holiday_list.from_date = "2024-01-01"
        holiday_list.to_date = "2024-12-31"
        holiday_list.insert()
        company = new_doc("Company")
        company.company_name = name + " Co"
        company.abbr = abbr
        company.default_holiday_list = holiday_list.name
        company.insert(ignore_mandatory=True, ignore_links=True)
        return holiday_list, company

    def test_static_link_message_matches_upstream(self):
        holiday_list, company = self._linked_holiday_list("Delete Link", "DLC")
        with self.assertRaises(exceptions.LinkExistsError) as raised:
            holiday_list.delete()
        message = str(raised.exception)
        self.assertIn("Cannot delete or cancel because", message)
        self.assertIn("Holiday List", message)
        self.assertIn("Company", message)
        self.assertIn(holiday_list.name, message)
        self.assertTrue(get_model("Holiday List").objects.filter(pk=holiday_list.name).exists())

    def test_submitted_document_cannot_be_deleted(self):
        meta = get_meta("Branch")
        original = meta.get("is_submittable")
        meta["is_submittable"] = 1
        try:
            self.branch.submit()
            with self.assertRaises(exceptions.ValidationError) as raised:
                self.branch.delete()
            self.assertIn("Submitted Record cannot be deleted", str(raised.exception))
            self.assertEqual(get_model("Branch").objects.get(pk=self.branch.name).docstatus, 1)
        finally:
            if original is None:
                meta.pop("is_submittable", None)
            else:
                meta["is_submittable"] = original

    def test_cancel_blocks_only_submitted_links(self):
        meta = get_meta("Branch")
        original = meta.get("is_submittable")
        meta["is_submittable"] = 1
        company = new_doc("Company")
        company.company_name = "Cancel Link Co"
        company.abbr = "CLC"
        company.insert(ignore_mandatory=True, ignore_links=True)
        cost_center = get_doc("Cost Center", get_model("Cost Center").objects.filter(company=company.name, is_group=0).values_list("name", flat=True).first())
        get_model("Cost Center").objects.filter(pk=cost_center.name).update(company=self.branch.name, docstatus=0)
        links = [{"parent": "Cost Center", "fieldname": "company", "issingle": 0}]
        try:
            self.branch.submit()
            with patch("apps.frappe.model.delete_doc.get_link_fields", return_value=links):
                self.branch.cancel()
            self.assertEqual(get_model("Branch").objects.get(pk=self.branch.name).docstatus, 2)

            self.branch = get_doc("Branch", "Delete Doc Branch")
            get_model("Branch").objects.filter(pk=self.branch.name).update(docstatus=1)
            self.branch = get_doc("Branch", self.branch.name)
            get_model("Cost Center").objects.filter(pk=cost_center.name).update(docstatus=1)
            with patch("apps.frappe.model.delete_doc.get_link_fields", return_value=links):
                with self.assertRaises(exceptions.LinkExistsError) as raised:
                    self.branch.cancel()
            self.assertIn("Cannot delete or cancel because", str(raised.exception))
            self.assertEqual(get_model("Branch").objects.get(pk=self.branch.name).docstatus, 1)
        finally:
            if original is None:
                meta.pop("is_submittable", None)
            else:
                meta["is_submittable"] = original

    def test_amended_from_does_not_block_cancel(self):
        meta = get_meta("Branch")
        original = meta.get("is_submittable")
        meta["is_submittable"] = 1
        links = [{"parent": "Cost Center", "fieldname": "amended_from", "issingle": 0}]
        try:
            self.branch.submit()
            with patch("apps.frappe.model.delete_doc.get_link_fields", return_value=links):
                self.branch.cancel()
            self.assertEqual(get_model("Branch").objects.get(pk=self.branch.name).docstatus, 2)
        finally:
            if original is None:
                meta.pop("is_submittable", None)
            else:
                meta["is_submittable"] = original

    def test_dynamic_link_blocks_delete(self):
        company = new_doc("Company")
        company.company_name = "Dynamic Link Co"
        company.abbr = "DYL"
        company.insert(ignore_mandatory=True, ignore_links=True)
        cost_center = get_doc("Cost Center", get_model("Cost Center").objects.filter(company=company.name, is_group=0).values_list("name", flat=True).first())
        get_model("Cost Center").objects.filter(pk=cost_center.name).update(
            cost_center_name="Branch",
            company=self.branch.name,
        )
        link_map = {
            "Branch": [_dict(parent="Cost Center", fieldname="company", options="cost_center_name")]
        }
        with patch("apps.frappe.model.delete_doc.get_dynamic_link_map", return_value=link_map):
            with self.assertRaises(exceptions.LinkExistsError) as raised:
                check_if_doc_is_dynamically_linked(self.branch)
            self.assertIn("Cost Center", str(raised.exception))
            with self.assertRaises(exceptions.LinkExistsError):
                self.branch.delete()
        self.assertTrue(get_model("Branch").objects.filter(pk=self.branch.name).exists())
        get_model("Cost Center").objects.filter(pk=cost_center.name).update(cost_center_name="Other")
        with patch("apps.frappe.model.delete_doc.get_dynamic_link_map", return_value=link_map):
            self.branch.delete()
        self.assertFalse(get_model("Branch").objects.filter(pk=self.branch.name).exists())

    def test_force_deletes_despite_links(self):
        holiday_list, company = self._linked_holiday_list("Force Delete", "FDC")
        holiday_list.delete(force=True)
        self.assertFalse(get_model("Holiday List").objects.filter(pk=holiday_list.name).exists())
        self.assertTrue(get_model("Company").objects.filter(pk=company.name).exists())

    def test_ignore_on_trash_skips_hook_and_still_runs_after_delete(self):
        from apps.erpnext.setup.doctype.branch.branch import Branch

        calls = []

        def on_trash(self):
            calls.append("on_trash")

        def after_delete(self):
            calls.append("after_delete")

        Branch.on_trash = on_trash
        Branch.after_delete = after_delete
        try:
            self.branch.delete(ignore_on_trash=True)
        finally:
            del Branch.on_trash
            del Branch.after_delete
        self.assertEqual(calls, ["after_delete"])
        self.assertFalse(get_model("Branch").objects.filter(pk=self.branch.name).exists())

    def test_on_trash_failure_keeps_the_row(self):
        from apps.erpnext.setup.doctype.branch.branch import Branch

        def on_trash(self):
            raise exceptions.ValidationError("stop trash")

        Branch.on_trash = on_trash
        try:
            with self.assertRaises(exceptions.ValidationError):
                self.branch.delete()
        finally:
            del Branch.on_trash
        self.assertTrue(get_model("Branch").objects.filter(pk=self.branch.name).exists())

    def test_missing_document_follows_ignore_missing(self):
        self.assertFalse(delete_doc("Branch", "missing-branch-name"))
        with self.assertRaises(exceptions.DoesNotExistError):
            delete_doc("Branch", "missing-branch-name", ignore_missing=False)

    def test_delete_removes_dynamic_reference_rows_and_child_rows(self):
        ToDo = resolve_model("ToDo")
        Comment = resolve_model("Comment")
        DocShare = resolve_model("DocShare")
        ToDo.objects.create(reference_type="Branch", reference_name=self.branch.name, description="linked")
        Comment.objects.create(reference_doctype="Branch", reference_name=self.branch.name, content="note")
        DocShare.objects.create(share_doctype="Branch", share_name=self.branch.name, read=True)
        company = new_doc("Company")
        company.company_name = "Child Delete Co"
        company.abbr = "CDC"
        company.insert(ignore_mandatory=True, ignore_links=True)
        fiscal_year = get_doc(
            {
                "doctype": "Fiscal Year",
                "year": "FY-DELETE-2099",
                "year_start_date": "2099-04-01",
                "year_end_date": "2100-03-31",
                "companies": [{"company": company.name}],
            }
        )
        fiscal_year.insert(ignore_links=True)
        self.assertTrue(get_model("Fiscal Year Company").objects.filter(parent=fiscal_year.name).exists())
        self.branch.delete()
        fiscal_year.delete()
        self.assertFalse(ToDo.objects.filter(reference_type="Branch", reference_name="Delete Doc Branch").exists())
        self.assertFalse(Comment.objects.filter(reference_doctype="Branch", reference_name="Delete Doc Branch").exists())
        self.assertFalse(DocShare.objects.filter(share_doctype="Branch", share_name="Delete Doc Branch").exists())
        self.assertFalse(get_model("Fiscal Year Company").objects.filter(parent="FY-DELETE-2099").exists())
        self.assertFalse(get_model("Fiscal Year").objects.filter(pk="FY-DELETE-2099").exists())

    def test_enabled_doctype_link_message_suggests_disable(self):
        uom = new_doc("UOM")
        uom.uom_name = "Delete UOM"
        uom.insert()
        other = new_doc("UOM")
        other.uom_name = "Other UOM"
        other.insert()
        factor = new_doc("UOM Conversion Factor")
        factor.category = "Delete UOM"
        factor.from_uom = uom.name
        factor.to_uom = other.name
        factor.value = 1
        factor.insert(ignore_links=True, ignore_mandatory=True)
        with self.assertRaises(exceptions.LinkExistsError) as raised:
            uom.delete()
        self.assertIn("You can disable this UOM instead of deleting it.", str(raised.exception))
        self.assertTrue(get_model("UOM").objects.filter(pk=uom.name).exists())
