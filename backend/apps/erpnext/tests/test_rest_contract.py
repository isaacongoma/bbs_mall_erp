import json

from django.test import Client, TestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.models import User
from apps.erpnext.registry import get_model
from apps.frappe import session
from apps.frappe.models import HasRole


class RestContractTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.admin = User.objects.create_superuser(username="rest-admin", email="rest-admin@bbs-erp.local", password="x")
        for index, role in enumerate(("System Manager", "HR Manager", "Item Manager", "Sales Master Manager")):
            HasRole.objects.create(name=f"rest-admin-role-{index}", parent=self.admin.email, role=role)
        self.hr = User.objects.create_user(username="rest-hr", email="rest-hr@bbs-erp.local", password="x")
        HasRole.objects.create(name="rest-hr-role", parent=self.hr.email, role="HR User")
        self.nobody = User.objects.create_user(username="rest-nobody", email="rest-nobody@bbs-erp.local", password="x")
        self.admin_client = self.client_for(self.admin)
        self.hr_client = self.client_for(self.hr)
        self.nobody_client = self.client_for(self.nobody)

    def client_for(self, user):
        token = str(AccessToken.for_user(user))
        return Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def post_json(self, client, url, payload):
        return client.post(url, data=json.dumps(payload), content_type="application/json")

    def test_resource_create_list_get_update_delete(self):
        created = self.post_json(self.hr_client, "/api/erpnext/resource/Branch/", {"branch": "REST Branch"})
        self.assertEqual(created.status_code, 200)
        self.assertEqual(created.json()["data"]["name"], "REST Branch")

        listing = self.hr_client.get("/api/erpnext/resource/Branch/", {"fields": json.dumps(["name"]), "filters": json.dumps({"name": "REST Branch"})})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()["data"], [{"name": "REST Branch"}])

        detail = self.hr_client.get("/api/erpnext/resource/Branch/REST Branch/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["data"]["branch"], "REST Branch")

        updated = self.hr_client.put(
            "/api/erpnext/resource/Branch/REST Branch/", data=json.dumps({"branch": "REST Branch"}), content_type="application/json"
        )
        self.assertEqual(updated.status_code, 200)

        deleted = self.hr_client.delete("/api/erpnext/resource/Branch/REST Branch/")
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(get_model("Branch").objects.filter(pk="REST Branch").exists())

    def test_resource_permission_and_not_found_status_codes(self):
        self.assertEqual(self.nobody_client.get("/api/erpnext/resource/Branch/").status_code, 403)
        self.assertEqual(self.post_json(self.nobody_client, "/api/erpnext/resource/Branch/", {"branch": "X"}).status_code, 403)
        self.assertEqual(self.hr_client.get("/api/erpnext/resource/Branch/Nope/").status_code, 404)
        self.assertEqual(Client(SERVER_NAME="localhost").get("/api/erpnext/resource/Branch/").status_code, 401)

    def test_resource_validation_error_shape(self):
        response = self.post_json(self.admin_client, "/api/erpnext/resource/Terms and Conditions/", {"title": "T", "terms": "{% if %}", "selling": 1})
        self.assertEqual(response.status_code, 417)
        body = response.json()
        self.assertIn("exc_type", body)
        self.assertIn("_server_messages", body)

    def test_resource_duplicate_status(self):
        self.post_json(self.hr_client, "/api/erpnext/resource/Branch/", {"branch": "Dup Branch"})
        response = self.post_json(self.hr_client, "/api/erpnext/resource/Branch/", {"branch": "Dup Branch"})
        self.assertEqual(response.status_code, 409)

    def test_method_client_get_list_and_count(self):
        self.post_json(self.hr_client, "/api/erpnext/resource/Branch/", {"branch": "Method Branch"})
        response = self.hr_client.get(
            "/api/erpnext/method/frappe.client.get_list/",
            {"doctype": "Branch", "fields": json.dumps(["name"]), "filters": json.dumps([["name", "like", "Method%"]])},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["message"], [{"name": "Method Branch"}])
        count = self.hr_client.get("/api/erpnext/method/frappe.client.get_count/", {"doctype": "Branch", "filters": json.dumps({"name": "Method Branch"})})
        self.assertEqual(count.json()["message"], 1)

    def test_method_client_get_value_and_get(self):
        self.post_json(self.hr_client, "/api/erpnext/resource/Branch/", {"branch": "Value Branch"})
        value = self.hr_client.get(
            "/api/erpnext/method/frappe.client.get_value/",
            {"doctype": "Branch", "fieldname": "branch", "filters": "Value Branch", "as_dict": 0},
        )
        self.assertEqual(value.json()["message"], "Value Branch")
        doc = self.hr_client.get("/api/erpnext/method/frappe.client.get/", {"doctype": "Branch", "name": "Value Branch"})
        self.assertEqual(doc.json()["message"]["branch"], "Value Branch")

    def test_method_client_insert_set_value_and_delete(self):
        inserted = self.post_json(self.hr_client, "/api/erpnext/method/frappe.client.insert/", {"doc": {"doctype": "Designation", "designation_name": "Lead"}})
        self.assertEqual(inserted.status_code, 200, inserted.content)
        changed = self.post_json(
            self.hr_client,
            "/api/erpnext/method/frappe.client.set_value/",
            {"doctype": "Designation", "name": "Lead", "fieldname": "description", "value": "Team lead"},
        )
        self.assertEqual(changed.json()["message"]["description"], "Team lead")
        standard = self.post_json(
            self.hr_client,
            "/api/erpnext/method/frappe.client.set_value/",
            {"doctype": "Designation", "name": "Lead", "fieldname": "owner", "value": "x"},
        )
        self.assertEqual(standard.status_code, 417)
        deleted = self.hr_client.delete("/api/erpnext/method/frappe.client.delete/?doctype=Designation&name=Lead")
        self.assertEqual(deleted.status_code, 403)
        self.assertTrue(get_model("Designation").objects.filter(pk="Lead").exists())

    def test_method_http_verb_restriction_and_whitelist(self):
        denied = self.hr_client.get("/api/erpnext/method/frappe.client.insert/", {"doc": json.dumps({"doctype": "Branch", "branch": "Nope"})})
        self.assertEqual(denied.status_code, 403)
        unlisted = self.hr_client.get("/api/erpnext/method/frappe.client.insert_doc/")
        self.assertEqual(unlisted.status_code, 403)
        outside = self.hr_client.get("/api/erpnext/method/os.system/")
        self.assertEqual(outside.status_code, 403)
        missing = self.hr_client.get("/api/erpnext/method/frappe.client.nope/")
        self.assertEqual(missing.status_code, 404)

    def test_method_requires_authentication(self):
        self.assertEqual(Client(SERVER_NAME="localhost").get("/api/erpnext/method/frappe.client.get_list/", {"doctype": "Branch"}).status_code, 401)

    def test_doctype_method_via_dotted_path(self):
        response = self.post_json(
            self.admin_client,
            "/api/erpnext/method/erpnext.setup.doctype.terms_and_conditions.terms_and_conditions.get_terms_and_conditions/",
            {"template_name": "Missing", "doc": {}},
        )
        self.assertEqual(response.status_code, 404)

    def test_run_doc_method_runs_whitelisted_controller_method(self):
        response = self.post_json(
            self.admin_client,
            "/api/erpnext/method/run_doc_method/",
            {
                "method": "get_supported_countries",
                "docs": {"doctype": "Holiday List", "holiday_list_name": "RDM"},
            },
        )
        self.assertEqual(response.status_code, 200)
        values = {row["value"] for row in response.json()["message"]["countries"]}
        self.assertIn("KE", values)

    def test_run_doc_method_rejects_unwhitelisted_method(self):
        response = self.post_json(
            self.admin_client,
            "/api/erpnext/method/run_doc_method/",
            {"method": "validate", "docs": {"doctype": "Holiday List", "holiday_list_name": "RDM"}},
        )
        self.assertEqual(response.status_code, 403)

    def test_treeview_methods_through_rest(self):
        response = self.admin_client.get(
            "/api/erpnext/method/frappe.desk.treeview.get_children/", {"doctype": "Item Group", "parent": ""}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json()["message"], list)

    def test_decimals_and_dates_serialize_as_numbers_and_strings(self):
        response = self.post_json(
            self.admin_client,
            "/api/erpnext/resource/Holiday List/",
            {"holiday_list_name": "Serialize", "from_date": "2023-01-01", "to_date": "2023-01-03", "holidays": [{"holiday_date": "2023-01-01", "description": "x"}]},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["total_holidays"], 1.0)
        self.assertEqual(data["from_date"], "2023-01-01")
        self.assertEqual(data["holidays"][0]["parent"], "Serialize")
