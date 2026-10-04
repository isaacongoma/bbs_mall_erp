from django.test import TestCase

import frappe
from apps.erpnext.registry import get_model
from apps.erpnext.setup.doctype.department.department import Department, add_node, get_children
from apps.frappe.desk.treeview import _get_children, get_children as treeview_children, make_tree_args
from apps.frappe.runtime import _dict, form_dict, get_doc, new_doc, session, local as frappe_local


def make_company(name, abbr):
    doc = new_doc("Company")
    doc.company_name = name
    doc.abbr = abbr
    doc.insert(ignore_mandatory=True, ignore_links=True)
    return doc


def create_department(department_name, parent_department=None, company=None, is_group=0):
    doc = frappe.get_doc(
        {
            "doctype": "Department",
            "is_group": is_group,
            "parent_department": parent_department,
            "department_name": department_name,
            "company": company,
        }
    ).insert()
    return doc


class TestDepartment(TestCase):
    def setUp(self):
        session.user = "Administrator"
        frappe_local.flags.ignore_chart_of_accounts = True
        self.company = make_company("Dept Test Co", "DTC")

    def test_controller_class_is_resolved(self):
        doc = create_department("Test Department", company=self.company.name)
        self.assertIsInstance(get_doc("Department", doc.name), Department)

    def test_remove_department_data(self):
        doc = create_department("Test Department", company=self.company.name)
        frappe.delete_doc("Department", doc.name)
        self.assertFalse(get_model("Department").objects.filter(pk=doc.name).exists())

    def test_autoname_appends_company_abbreviation(self):
        doc = create_department("Accounts Desk", company=self.company.name)
        self.assertEqual(doc.name, "Accounts Desk - DTC")

    def test_get_children_by_company_and_parent(self):
        parent = create_department("Head Office", company=self.company.name, is_group=1)
        create_department("Finance Desk", parent.name, self.company.name)
        create_department("Sales Desk", parent.name, self.company.name)

        rows = get_children("Department", parent.name, self.company.name)
        self.assertEqual(sorted(row.value for row in rows), ["Finance Desk - DTC", "Sales Desk - DTC"])
        self.assertTrue(all(row.expandable == 0 for row in rows))

        without_company = get_children("Department", parent.name)
        self.assertEqual(sorted(row.value for row in without_company), ["Finance Desk - DTC", "Sales Desk - DTC"])

    def test_get_children_company_as_parent_returns_root(self):
        rows = get_children("Department", self.company.name, self.company.name)
        self.assertTrue(all(isinstance(row.value, str) for row in rows))

    def test_add_node_creates_department_and_ignores_caller_doctype(self):
        parent = create_department("Operations Hub", company=self.company.name, is_group=1)
        form_dict.clear()
        form_dict.update(
            {
                "doctype": "User",
                "is_root": "false",
                "department_name": "Logistics",
                "company": self.company.name,
                "parent": parent.name,
                "parent_department": parent.name,
                "is_group": 0,
            }
        )
        add_node()
        created = get_model("Department").objects.get(pk="Logistics - DTC")
        self.assertEqual(created.parent_department, parent.name)

    def test_add_node_company_parent_becomes_root(self):
        form_dict.clear()
        form_dict.update(
            {
                "doctype": "Department",
                "is_root": "false",
                "department_name": "Admin",
                "company": self.company.name,
                "parent": self.company.name,
                "is_group": 0,
            }
        )
        add_node()
        self.assertTrue(get_model("Department").objects.filter(pk="Admin - DTC").exists())


class TestTreeview(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.company = make_company("Tree Test Co", "TTC")

    def test_make_tree_args(self):
        args = make_tree_args(doctype="Department", is_root="true", parent="Parent One")
        self.assertIs(args.is_root, True)
        self.assertEqual(args.parent_department, "Parent One")
        same = make_tree_args(doctype="Department", is_root="false", parent="Department")
        self.assertIs(same.is_root, False)
        self.assertNotIn("parent_department", same)

    def test_treeview_get_children_uses_nsm_parent_field(self):
        parent = create_department("Plant", company=self.company.name, is_group=1)
        create_department("Quality", parent.name, self.company.name)
        rows = treeview_children("Department", parent.name)
        self.assertEqual([row.value for row in rows], ["Quality - TTC"])
        self.assertEqual(rows[0].title, "Quality - TTC")
        self.assertEqual(rows[0].expandable, 0)

    def test_get_children_excludes_cancelled_and_disabled(self):
        parent = create_department("Wing", company=self.company.name, is_group=1)
        child = create_department("Lab", parent.name, self.company.name)
        model = get_model("Department")
        model.objects.filter(pk=child.name).update(disabled=1)
        self.assertEqual(_get_children("Department", parent.name), [])
        self.assertEqual(len(_get_children("Department", parent.name, include_disabled=True)), 1)
