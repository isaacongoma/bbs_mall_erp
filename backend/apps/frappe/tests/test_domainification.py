import frappe
from frappe.core.doctype.domain_settings.domain_settings import get_active_modules
from frappe.core.page.permission_manager.permission_manager import get_roles_and_doctypes
from frappe.tests import IntegrationTestCase


class TestDomainification(IntegrationTestCase):
    def setUp(self):
        self.new_domain("_Test Domain 1")
        self.new_domain("_Test Domain 2")

        self.remove_from_active_domains(remove_all=True)
        self.add_active_domain("_Test Domain 1")

    def tearDown(self):
        frappe.db.delete("Role", {"name": "_Test Role"})
        frappe.db.delete("Has Role", {"role": "_Test Role"})
        frappe.db.delete("Domain", {"name": ("in", ("_Test Domain 1", "_Test Domain 2"))})
        frappe.delete_doc("DocType", "Test Domainification")
        self.remove_from_active_domains(remove_all=True)

    def add_active_domain(self, domain):
        """add domain in active domain"""

        if not domain:
            return

        domain_settings = frappe.get_doc("Domain Settings", "Domain Settings")
        domain_settings.append("active_domains", {"domain": domain})
        domain_settings.save()

    def remove_from_active_domains(self, domain=None, remove_all=False):
        """remove domain from domain settings"""
        if not (domain or remove_all):
            return

        domain_settings = frappe.get_doc("Domain Settings", "Domain Settings")

        if remove_all:
            domain_settings.set("active_domains", [])
        else:
            to_remove = []
            [to_remove.append(row) for row in domain_settings.active_domains if row.domain == domain]
            [domain_settings.remove(row) for row in to_remove]

        domain_settings.save()

    def new_domain(self, domain):
        frappe.get_doc({"doctype": "Domain", "domain": domain}).insert()

    def new_doctype(self, name):
        return frappe.get_doc(
            {
                "doctype": "DocType",
                "module": "Core",
                "custom": 1,
                "fields": [{"label": "Some Field", "fieldname": "some_fieldname", "fieldtype": "Data"}],
                "permissions": [{"role": "System Manager", "read": 1}],
                "name": name,
            }
        )

    def test_active_domains(self):
        self.assertTrue("_Test Domain 1" in frappe.get_active_domains())
        self.assertFalse("_Test Domain 2" in frappe.get_active_domains())

        self.add_active_domain("_Test Domain 2")
        self.assertTrue("_Test Domain 2" in frappe.get_active_domains())

        self.remove_from_active_domains("_Test Domain 1")
        self.assertTrue("_Test Domain 1" not in frappe.get_active_domains())

    def test_doctype_and_role_domainification(self):
        """
        test if doctype is hidden if the doctype's restrict to domain is not included
        in active domains
        """

        test_doctype = self.new_doctype("Test Domainification")
        test_doctype.insert()

        test_role = frappe.get_doc({"doctype": "Role", "role_name": "_Test Role"}).insert()

        results = get_roles_and_doctypes()
        self.assertTrue("Test Domainification" in [d.get("value") for d in results.get("doctypes")])
        self.assertTrue("_Test Role" in [d.get("value") for d in results.get("roles")])

        self.add_active_domain("_Test Domain 2")
        test_doctype.restrict_to_domain = "_Test Domain 2"
        test_doctype.save()

        test_role.restrict_to_domain = "_Test Domain 2"
        test_role.save()

        results = get_roles_and_doctypes()
        self.assertTrue("Test Domainification" in [d.get("value") for d in results.get("doctypes")])
        self.assertTrue("_Test Role" in [d.get("value") for d in results.get("roles")])

        self.remove_from_active_domains("_Test Domain 2")
        results = get_roles_and_doctypes()

        self.assertTrue("Test Domainification" not in [d.get("value") for d in results.get("doctypes")])
        self.assertTrue("_Test Role" not in [d.get("value") for d in results.get("roles")])
