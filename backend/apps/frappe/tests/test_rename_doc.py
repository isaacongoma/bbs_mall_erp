from contextlib import redirect_stdout
from io import StringIO
from unittest.mock import patch

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.core.models import User
from apps.erpnext.registry import get_meta, list_doctypes
from apps.erpnext.setup.doctype.branch.branch import Branch
from apps.erpnext.setup.doctype.terms_and_conditions.terms_and_conditions import TermsandConditions
from apps.frappe import exceptions
from apps.frappe.model.naming import is_autoincremented, validate_name
from apps.frappe.model.rename_doc import (
    bulk_rename,
    get_link_fields,
    get_select_fields,
    rename_doc,
    rename_doctype,
    rename_dynamic_links,
    update_document_title,
    update_parenttype_values,
    update_select_field_values,
    validate_rename,
)
from apps.frappe.models import Singles
from apps.frappe.runtime import _dict, db, get_doc, new_doc, session, local as frappe_local
from apps.frappe.utils.nestedset import NestedSetInvalidMergeError
from apps.erpnext.registry import get_model


class RenameDocTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        frappe_local.flags.ignore_chart_of_accounts = True
        from apps.frappe.runtime import flags, local

        flags.link_fields = {}
        local.message_log = []
        local.dynamic_link_map = None

    def tearDown(self):
        session.user = "Administrator"

    def _branch(self, name):
        doc = new_doc("Branch")
        doc.branch = name
        doc.insert()
        return doc

    def _company(self, name, abbr):
        doc = new_doc("Company")
        doc.company_name = name
        doc.abbr = abbr
        doc.insert(ignore_mandatory=True, ignore_links=True)
        return doc

    def test_rename_requires_doctype_old_and_new(self):
        with self.assertRaises(TypeError) as raised:
            rename_doc()
        self.assertIn("required arguments", str(raised.exception))

    def test_rename_updates_name_and_autoname_field(self):
        branch = self._branch("Rename Source")
        renamed = rename_doc("Branch", branch.name, "Rename Target")
        self.assertEqual(renamed, "Rename Target")
        row = get_model("Branch").objects.get(pk="Rename Target")
        self.assertEqual(row.branch, "Rename Target")
        self.assertFalse(get_model("Branch").objects.filter(pk="Rename Source").exists())

    def test_rename_alert_names_both_documents(self):
        from apps.frappe.runtime import local

        branch = self._branch("Alert Source")
        rename_doc("Branch", branch.name, "Alert Target")
        messages = [entry["message"] for entry in local.message_log]
        self.assertTrue(any("Document renamed from" in message and "Alert Source" in message and "Alert Target" in message for message in messages))

    def test_show_alert_false_skips_the_message(self):
        from apps.frappe.runtime import local

        branch = self._branch("Quiet Source")
        rename_doc("Branch", branch.name, "Quiet Target", show_alert=False)
        self.assertFalse(any("Document renamed from" in entry["message"] for entry in local.message_log))

    def test_doc_rename_method_updates_the_instance_name(self):
        branch = self._branch("Method Source")
        returned = branch.rename("Method Target")
        self.assertEqual(returned, "Method Target")
        self.assertEqual(branch.name, "Method Target")
        self.assertTrue(get_model("Branch").objects.filter(pk="Method Target").exists())

    def test_hook_order_is_before_after_then_on_rename(self):
        order = []

        def before_rename(self, old, new, merge=False):
            order.append("before")

        def after_rename(self, old, new, merge=False):
            order.append("after")

        def on_rename(self, old, new, merge=False):
            order.append(("on", old, new, merge))

        Branch.before_rename = before_rename
        Branch.after_rename = after_rename
        Branch.on_rename = on_rename
        try:
            branch = self._branch("Hook Source")
            rename_doc("Branch", branch.name, "Hook Target")
        finally:
            del Branch.before_rename
            del Branch.after_rename
            del Branch.on_rename
        self.assertEqual(order[0], "before")
        self.assertEqual(order[1], "after")
        self.assertEqual(order[2], ("on", "Hook Source", "Hook Target", False))

    def test_validate_name_rules_and_whitespace(self):
        branch = self._branch("Trim Source")
        self.assertEqual(rename_doc("Branch", branch.name, "  Trim Target  "), "Trim Target")
        self.assertEqual(get_model("Branch").objects.get(pk="Trim Target").branch, "Trim Target")
        with self.assertRaises(exceptions.NameError) as same_type:
            rename_doc("Branch", "Trim Target", 5)
        self.assertIn("Invalid name type", str(same_type.exception))
        with self.assertRaises(exceptions.NameError) as special:
            rename_doc("Branch", "Trim Target", "Bad<Name>")
        self.assertIn("special characters", str(special.exception))
        with self.assertRaises(exceptions.NameError) as prefixed:
            rename_doc("Branch", "Trim Target", "New Branch extra")
        self.assertIn("contact the administrator", str(prefixed.exception))
        with self.assertRaises(exceptions.NameError) as same_doctype:
            rename_doc("Branch", "Trim Target", "Branch")
        self.assertIn("cannot be", str(same_doctype.exception))
        with self.assertRaises(exceptions.ValidationError) as empty:
            validate_name("Branch", "")
        self.assertIn("No Name Specified", str(empty.exception))
        self.assertFalse(is_autoincremented("Branch"))
        self.assertTrue(is_autoincremented("Branch", _dict(autoname="autoincrement", issingle=0)))
        self.assertFalse(is_autoincremented("Branch", _dict(autoname="autoincrement", issingle=1)))

    def test_same_name_missing_name_and_existing_target_are_rejected(self):
        branch = self._branch("Kept Branch")
        other = self._branch("Other Branch")
        with self.assertRaises(exceptions.ValidationError) as same:
            rename_doc("Branch", branch.name, branch.name)
        self.assertIn("old and new name are the same", str(same.exception))
        with self.assertRaises(exceptions.DoesNotExistError) as missing:
            rename_doc("Branch", "missing-branch-name", "Unused Branch")
        self.assertIn("not found", str(missing.exception))
        with self.assertRaises(exceptions.ValidationError) as unvalidated:
            validate_rename("Branch", "missing-branch-name", "Unused Branch", get_doc("Branch", branch.name).meta, False)
        self.assertIn("doesn't exist", str(unvalidated.exception))
        with self.assertRaises(exceptions.ValidationError) as exists:
            rename_doc("Branch", branch.name, other.name)
        self.assertIn("Another Branch with name", str(exists.exception))
        self.assertTrue(get_model("Branch").objects.filter(pk=branch.name).exists())

    def test_ignore_if_exists_still_hits_the_primary_key(self):
        branch = self._branch("Ignore Source")
        other = self._branch("Ignore Target")
        with self.assertRaises(IntegrityError) as raised:
            with transaction.atomic():
                rename_doc("Branch", branch.name, other.name, ignore_if_exists=True)
        self.assertTrue(db.is_duplicate_entry(raised.exception))
        self.assertTrue(get_model("Branch").objects.filter(pk="Ignore Source").exists())
        self.assertTrue(get_model("Branch").objects.filter(pk="Ignore Target").exists())

    def test_merge_requires_the_target_and_then_deletes_the_source(self):
        source = self._branch("Merge Source")
        with self.assertRaises(exceptions.ValidationError) as missing:
            rename_doc("Branch", source.name, "Merge Missing", merge=True)
        self.assertIn("does not exist, select a new target to merge", str(missing.exception))
        target = self._branch("Merge Target")
        renamed = rename_doc("Branch", source.name, target.name, merge=True)
        self.assertEqual(renamed, target.name)
        self.assertFalse(get_model("Branch").objects.filter(pk=source.name).exists())
        self.assertTrue(get_model("Branch").objects.filter(pk=target.name).exists())

    def test_rename_is_rejected_without_allow_rename_unless_forced_or_ignored(self):
        fiscal_year = get_doc(
            {
                "doctype": "Fiscal Year",
                "year": "FY-REN-2499",
                "year_start_date": "2499-04-01",
                "year_end_date": "2500-03-31",
            }
        )
        fiscal_year.insert(ignore_links=True)
        with self.assertRaises(exceptions.ValidationError) as rejected:
            rename_doc("Fiscal Year", fiscal_year.name, "FY-REN-2500")
        self.assertIn("not allowed to be renamed", str(rejected.exception))
        self.assertTrue(get_model("Fiscal Year").objects.filter(pk="FY-REN-2499").exists())
        renamed = rename_doc("Fiscal Year", fiscal_year.name, "FY-REN-2500", ignore_permissions=True)
        self.assertEqual(renamed, "FY-REN-2500")
        self.assertEqual(get_model("Fiscal Year").objects.get(pk="FY-REN-2500").year, "FY-REN-2500")

    def test_force_rename_updates_child_parent(self):
        company = self._company("Child Rename Co", "CRC")
        fiscal_year = get_doc(
            {
                "doctype": "Fiscal Year",
                "year": "FY-CHILD-2510",
                "year_start_date": "2510-04-01",
                "year_end_date": "2511-03-31",
                "companies": [{"company": company.name}],
            }
        )
        fiscal_year.insert(ignore_links=True)
        self.assertTrue(get_model("Fiscal Year Company").objects.filter(parent="FY-CHILD-2510").exists())
        rename_doc("Fiscal Year", "FY-CHILD-2510", "FY-CHILD-2511", force=True)
        self.assertFalse(get_model("Fiscal Year Company").objects.filter(parent="FY-CHILD-2510").exists())
        self.assertEqual(get_model("Fiscal Year Company").objects.get(parent="FY-CHILD-2511").parenttype, "Fiscal Year")

    def test_link_field_values_follow_the_new_name_without_touching_modified(self):
        source = new_doc("UOM")
        source.uom_name = "Rename UOM"
        source.insert()
        other = new_doc("UOM")
        other.uom_name = "Stay UOM"
        other.insert()
        factor = new_doc("UOM Conversion Factor")
        factor.category = "Rename UOM"
        factor.from_uom = source.name
        factor.to_uom = other.name
        factor.value = 1
        factor.insert(ignore_links=True, ignore_mandatory=True)
        modified = get_model("UOM Conversion Factor").objects.get(pk=factor.name).modified
        rename_doc("UOM", source.name, "Renamed UOM")
        row = get_model("UOM Conversion Factor").objects.get(pk=factor.name)
        self.assertEqual(row.from_uom, "Renamed UOM")
        self.assertEqual(row.to_uom, "Stay UOM")
        self.assertEqual(row.modified, modified)
        self.assertEqual(get_model("UOM").objects.get(pk="Renamed UOM").uom_name, "Renamed UOM")

    def test_dynamic_link_values_follow_the_new_name(self):
        branch = self._branch("Dynamic Source")
        company = self._company("Dynamic Link Co", "DLC2")
        cost_center = get_doc("Cost Center", get_model("Cost Center").objects.filter(company=company.name, is_group=0).values_list("name", flat=True).first())
        get_model("Cost Center").objects.filter(pk=cost_center.name).update(cost_center_name="Branch", company=branch.name)
        links = {"Branch": [_dict(parent="Cost Center", fieldname="company", options="cost_center_name")]}
        with patch("apps.frappe.model.rename_doc.get_dynamic_link_map", return_value=links):
            rename_doc("Branch", branch.name, "Dynamic Target")
        self.assertEqual(get_model("Cost Center").objects.get(pk=cost_center.name).company, "Dynamic Target")

    def test_single_dynamic_link_updates_singles(self):
        Singles.objects.create(doctype="Rename Single", field="ref_doctype", value="Branch")
        Singles.objects.create(doctype="Rename Single", field="ref_name", value="OLD")
        Singles.objects.create(doctype="Rename Single", field="other_doctype", value="Other")
        Singles.objects.create(doctype="Rename Single", field="other_name", value="OLD")
        link = _dict(parent="Rename Single", fieldname="ref_name", options="ref_doctype")
        other = _dict(parent="Rename Single", fieldname="other_name", options="other_doctype")
        meta = _dict(issingle=1, is_virtual=0, name="Rename Single")
        with patch("apps.frappe.model.rename_doc.get_dynamic_link_map", return_value={"Branch": [link, other]}), patch(
            "apps.frappe.model.rename_doc.frappe.get_meta", return_value=meta
        ):
            rename_dynamic_links("Branch", "OLD", "NEW")
        self.assertEqual(Singles.objects.get(doctype="Rename Single", field="ref_name").value, "NEW")
        self.assertEqual(Singles.objects.get(doctype="Rename Single", field="other_name").value, "OLD")
        meta.is_virtual = 1
        Singles.objects.filter(doctype="Rename Single", field="ref_name").update(value="OLD")
        with patch("apps.frappe.model.rename_doc.get_dynamic_link_map", return_value={"Branch": [link]}), patch(
            "apps.frappe.model.rename_doc.frappe.get_meta", return_value=meta
        ):
            rename_dynamic_links("Branch", "OLD", "NEW")
        self.assertEqual(Singles.objects.get(doctype="Rename Single", field="ref_name").value, "OLD")

    def test_nested_set_rename_updates_children_and_rejects_mixed_merge(self):
        get_model("Territory").objects.all().delete()
        root = new_doc("Territory")
        root.territory_name = "Rename Root"
        root.is_group = 1
        root.parent_territory = ""
        root.insert()
        parent = new_doc("Territory")
        parent.territory_name = "Rename Parent"
        parent.is_group = 1
        parent.parent_territory = root.name
        parent.insert()
        child = new_doc("Territory")
        child.territory_name = "Rename Child"
        child.is_group = 0
        child.parent_territory = parent.name
        child.insert()
        leaf = new_doc("Territory")
        leaf.territory_name = "Rename Leaf"
        leaf.is_group = 0
        leaf.parent_territory = root.name
        leaf.insert()
        with self.assertRaises(NestedSetInvalidMergeError) as raised:
            rename_doc("Territory", parent.name, leaf.name, merge=True)
        self.assertIn("Group-to-Group or Leaf Node-to-Leaf Node", str(raised.exception))
        self.assertTrue(get_model("Territory").objects.filter(pk=parent.name).exists())
        rename_doc("Territory", parent.name, "Rename Parent Moved")
        moved_child = get_model("Territory").objects.get(pk=child.name)
        moved_parent = get_model("Territory").objects.get(pk="Rename Parent Moved")
        self.assertEqual(moved_child.parent_territory, "Rename Parent Moved")
        self.assertEqual(moved_child.old_parent, "Rename Parent Moved")
        self.assertEqual(moved_parent.territory_name, "Rename Parent Moved")
        self.assertLess(moved_parent.lft, moved_child.lft)
        self.assertGreater(moved_parent.rgt, moved_child.rgt)
        other = new_doc("Territory")
        other.territory_name = "Rename Sibling"
        other.is_group = 0
        other.parent_territory = root.name
        other.insert()
        rename_doc("Territory", leaf.name, other.name, merge=True)
        self.assertFalse(get_model("Territory").objects.filter(pk=leaf.name).exists())
        self.assertTrue(get_model("Territory").objects.filter(pk=other.name).exists())
        for row in get_model("Territory").objects.all():
            self.assertLess(row.lft, row.rgt)

    def test_department_before_rename_appends_the_company_abbreviation(self):
        company = self._company("Dept Rename Co", "DRC")
        department = new_doc("Department")
        department.department_name = "Ops"
        department.company = company.name
        department.is_group = 1
        department.insert()
        self.assertEqual(department.name, "Ops - DRC")
        renamed = rename_doc("Department", department.name, "Desk")
        self.assertEqual(renamed, "Desk - DRC")
        self.assertEqual(get_model("Department").objects.get(pk="Desk - DRC").department_name, "Ops")

    def test_cost_center_rename_uses_nested_set_and_company_abbreviation(self):
        company = self._company("Rename CC Co", "RCC")
        root = get_doc("Cost Center", get_model("Cost Center").objects.get(company=company.name, parent_cost_center="").name)
        leaf = new_doc("Cost Center")
        leaf.cost_center_name = "Leaf One"
        leaf.company = company.name
        leaf.parent_cost_center = root.name
        leaf.is_group = 0
        leaf.insert(ignore_mandatory=True)
        group = new_doc("Cost Center")
        group.cost_center_name = "Group One"
        group.company = company.name
        group.parent_cost_center = root.name
        group.is_group = 1
        group.insert(ignore_mandatory=True)
        with self.assertRaises(exceptions.ValidationError) as rejected:
            rename_doc("Cost Center", leaf.name, "Leaf Two")
        self.assertIn("not allowed to be renamed", str(rejected.exception))
        with self.assertRaises(NestedSetInvalidMergeError):
            rename_doc("Cost Center", leaf.name, group.name, merge=True, force=True)
        renamed = rename_doc("Cost Center", leaf.name, "Leaf Two", force=True)
        self.assertEqual(renamed, "Leaf Two - RCC")
        row = get_model("Cost Center").objects.get(pk="Leaf Two - RCC")
        self.assertEqual(row.cost_center_name, "Leaf Two")

    def test_write_permission_is_required(self):
        branch = self._branch("Perm Source")
        loaded = get_doc("Branch", branch.name)
        user = User.objects.create_user(username="rename-nobody", email="rename-nobody@bbs-erp.local", password="x")
        session.user = user.email
        try:
            with self.assertRaises(exceptions.ValidationError) as raised:
                validate_rename(
                    "Branch",
                    branch.name,
                    "Perm Target",
                    loaded.meta,
                    False,
                    force=True,
                    old_doc=loaded,
                )
            self.assertIn("You need write permission on Branch", str(raised.exception))
            with self.assertRaises(exceptions.PermissionError):
                update_document_title(doctype="Branch", docname=branch.name, name="Perm Target")
        finally:
            session.user = "Administrator"
        self.assertTrue(get_model("Branch").objects.filter(pk=branch.name).exists())

    def test_update_document_title_renames_and_edits_a_title_field(self):
        branch = self._branch("Title Source")
        with self.assertRaises(exceptions.ValidationError) as bad_type:
            update_document_title(doctype="Branch", docname=branch.name, title={}, name={"hack": "this"})
        self.assertIn("must be of type str or None", str(bad_type.exception))
        returned = update_document_title(doctype="Branch", docname=branch.name, new_name="Title Target", enqueue=True)
        self.assertEqual(returned, "Title Target")
        self.assertEqual(get_model("Branch").objects.get(pk="Title Target").branch, "Title Target")
        untouched = self._branch("Title Untouched")
        update_document_title(doctype="Branch", docname=untouched.name, title="Ignored Title")
        self.assertEqual(get_model("Branch").objects.get(pk=untouched.name).branch, untouched.name)
        terms = new_doc("Terms and Conditions")
        terms.title = "Terms Original"
        terms.selling = 1
        terms.insert()
        update_document_title(doctype="Terms and Conditions", docname=terms.name, title="Terms Edited")
        reloaded = get_doc("Terms and Conditions", terms.name)
        self.assertEqual(reloaded.name, "Terms Original")
        self.assertEqual(reloaded.title, "Terms Edited")
        duplicate = Exception("duplicate key")
        duplicate.pgcode = "23505"
        with patch.object(TermsandConditions, "save", side_effect=duplicate):
            with self.assertRaises(exceptions.DuplicateEntryError) as raised:
                update_document_title(doctype="Terms and Conditions", docname=terms.name, title="Terms Again")
        self.assertIn("already exists", str(raised.exception))
        with patch.object(TermsandConditions, "save", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                update_document_title(doctype="Terms and Conditions", docname=terms.name, title="Terms Again")

    def test_single_doctype_meta_cannot_be_renamed(self):
        meta = get_doc("Branch", self._branch("Single Meta").name).meta
        meta.issingle = 1
        with self.assertRaises(exceptions.ValidationError) as raised:
            validate_rename("Branch", "Single Meta", "Single Meta New", meta, False, force=True, ignore_permissions=True)
        self.assertIn("Single DocTypes cannot be renamed", str(raised.exception))

    def test_parenttype_and_in_memory_option_updates_restore(self):
        company = self._company("Parenttype Co", "PTC")
        fiscal_year = get_doc(
            {
                "doctype": "Fiscal Year",
                "year": "FY-PARENT-2520",
                "year_start_date": "2520-04-01",
                "year_end_date": "2521-03-31",
                "companies": [{"company": company.name}],
            }
        )
        fiscal_year.insert(ignore_links=True)
        child = get_model("Fiscal Year Company").objects.get(parent=fiscal_year.name)
        get_model("Fiscal Year Company").objects.filter(pk=child.name).update(parenttype="Legacy FY")
        update_parenttype_values("Legacy FY", "Fiscal Year")
        self.assertEqual(get_model("Fiscal Year Company").objects.get(pk=child.name).parenttype, "Fiscal Year")
        snapshot = []
        for parent in list_doctypes():
            meta = get_meta(parent)
            for field in meta.get("fields") or []:
                if field.get("fieldtype") == "Select":
                    snapshot.append((parent, field, field.get("options")))
        target_parent, target, _original = next(row for row in snapshot if row[1].get("fieldname") != "fieldtype")
        target["options"] = "Alpha\nBranch\nOmega"
        try:
            found = get_select_fields("Branch", "Unused Select Parent")
            self.assertTrue(any(row.parent == target_parent and row.fieldname == target.get("fieldname") for row in found))
            update_select_field_values("Branch", "Outlet")
            self.assertEqual(target["options"], "Alpha\nOutlet\nOmega")
            rename_doctype("DocType", "UOM", "UOM Archived")
            self.assertNotIn("from_uom", {row.fieldname for row in get_link_fields("UOM")})
        finally:
            for _parent, field, options in snapshot:
                field["options"] = options
            for parent in list_doctypes():
                meta = get_meta(parent)
                for field in meta.get("fields") or []:
                    if field.get("options") == "UOM Archived":
                        field["options"] = "UOM"
            from apps.frappe.runtime import flags

            flags.link_fields = {}

    def test_bulk_rename_limits_success_and_failure(self):
        with self.assertRaises(exceptions.ValidationError) as empty:
            bulk_rename("Branch", None)
        self.assertIn("Please select a valid csv file", str(empty.exception))
        with self.assertRaises(exceptions.ValidationError) as limited:
            bulk_rename("Branch", [["a", "b"] for _ in range(501)])
        self.assertIn("Maximum 500 rows allowed", str(limited.exception))
        first = self._branch("Bulk One")
        second = self._branch("Bulk Two")
        with patch.object(db, "commit", return_value=None) as commit, patch.object(db, "rollback", return_value=None) as rollback, patch(
            "apps.frappe.enqueue"
        ) as enqueue:
            message_log = bulk_rename(
                "Branch",
                [[first.name, "Bulk One New", False], [second.name, "Bulk Two New"], ["missing-bulk", "nowhere"]],
            )
            printed = StringIO()
            with redirect_stdout(printed):
                self.assertIsNone(bulk_rename("Branch", [["Bulk One New", "Bulk One Console"]], via_console=True))
        self.assertEqual(len(message_log), 3)
        self.assertTrue(message_log[0].startswith("Successful:"))
        self.assertTrue(message_log[1].startswith("Successful:"))
        self.assertTrue(message_log[2].startswith("** Failed:"))
        self.assertIn("Successful", printed.getvalue())
        commit.assert_called()
        rollback.assert_called()
        enqueue.assert_any_call("frappe.utils.global_search.rebuild_for_doctype", doctype="Branch")
        self.assertTrue(get_model("Branch").objects.filter(pk="Bulk One Console").exists())
