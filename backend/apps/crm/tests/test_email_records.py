import json

from django.test import Client, TestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.crm_custom_fields import install_crm_custom_fields
from apps.core.models import User
from apps.erpnext.registry import get_model
from apps.frappe import session


class EmailRecordsUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        install_crm_custom_fields()
        self.user = User.objects.create_user(username="e1", email="e1@bbs-erp.local", password="x")
        token = str(AccessToken.for_user(self.user))
        self.client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def post(self, url, payload):
        return self.client.post(url, data=json.dumps(payload), content_type="application/json")

    def test_template_round_trip_uses_the_canonical_table(self):
        created = self.post(
            "/api/crm/email-templates/",
            {"name": "Welcome", "enabled": True, "subject": "Hi", "response": "<p>x</p>", "reference_doctype": "CRM Lead"},
        )
        self.assertEqual(created.status_code, 201, created.content)
        stored = get_model("Email Template").objects.get(pk="Welcome")
        self.assertEqual(stored.enabled, 1)
        self.assertEqual(stored.owner, self.user.email)
        body = self.client.get("/api/crm/email-templates/Welcome/").json()
        self.assertEqual(body["enabled"], True)
        self.assertEqual(body["owner"], self.user.email)
        self.assertEqual(body["use_html"], False)
        patched = self.client.patch(
            "/api/crm/email-templates/Welcome/", data=json.dumps({"enabled": False}), content_type="application/json"
        )
        self.assertEqual(patched.status_code, 200, patched.content)
        self.assertEqual(get_model("Email Template").objects.get(pk="Welcome").enabled, 0)
        self.assertEqual(self.client.delete("/api/crm/email-templates/Welcome/").status_code, 204)

    def test_account_masks_secrets_and_keeps_a_single_default(self):
        first = self.post(
            "/api/crm/email-accounts/",
            {"email_account_name": "Sales", "email_id": "sales@x.com", "password": "secret", "default_outgoing": True},
        )
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(first.json()["password"], "*****")
        self.post(
            "/api/crm/email-accounts/",
            {"email_account_name": "Support", "email_id": "support@x.com", "default_outgoing": True},
        )
        defaults = list(get_model("Email Account").objects.filter(default_outgoing=1).values_list("name", flat=True))
        self.assertEqual(defaults, ["Support"])
        kept = self.client.patch(
            "/api/crm/email-accounts/Sales/", data=json.dumps({"password": "*****"}), content_type="application/json"
        )
        self.assertEqual(kept.status_code, 200, kept.content)
        self.assertEqual(get_model("Email Account").objects.get(pk="Sales").password, "secret")


class AddressUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.user = User.objects.create_user(username="ad1", email="ad1@bbs-erp.local", password="x")
        token = str(AccessToken.for_user(self.user))
        self.client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_address_endpoint_uses_the_canonical_table(self):
        created = self.client.post(
            "/api/crm/addresses/",
            data=json.dumps({"address_title": "HQ", "address_type": "Billing", "address_line1": "1 Moi Ave", "city": "Nairobi", "country": "Kenya"}),
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        name = created.json()["name"]
        stored = get_model("Address").objects.get(pk=name)
        self.assertEqual((stored.address_title, stored.city, stored.owner), ("HQ", "Nairobi", self.user.email))
        self.assertEqual(self.client.get(f"/api/crm/addresses/{name}/").json()["address_line1"], "1 Moi Ave")
        patched = self.client.patch(
            f"/api/crm/addresses/{name}/", data=json.dumps({"city": "Mombasa"}), content_type="application/json"
        )
        self.assertEqual(patched.status_code, 200, patched.content)
        self.assertEqual(get_model("Address").objects.get(pk=name).city, "Mombasa")
        self.assertEqual(self.client.delete(f"/api/crm/addresses/{name}/").status_code, 204)


class DataImportUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.user = User.objects.create_user(username="di1", email="di1@bbs-erp.local", password="x")
        token = str(AccessToken.for_user(self.user))
        self.client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_import_round_trip_uses_canonical_tables(self):
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage

        path = default_storage.save("uploads/test/di_contacts.csv", ContentFile(b"First Name,Last Name\nAnn,Lee\nBob,Ray\n"))
        created = self.client.post(
            "/api/crm/data-imports/",
            data=json.dumps({"reference_doctype": "Contact", "import_file": default_storage.url(path)}),
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        name = created.json()["name"]
        self.assertTrue(name.startswith("DI-"))
        self.assertEqual(get_model("Data Import").objects.get(pk=name).status, "Pending")
        preview = self.client.get("/api/crm/data-imports/preview/", {"data_import": name})
        self.assertEqual(preview.status_code, 200, preview.content)
        started = self.client.post(
            "/api/crm/data-imports/start/", data=json.dumps({"data_import": name}), content_type="application/json"
        )
        self.assertEqual(started.status_code, 200, started.content)
        self.assertEqual(started.json()["status"], "Success")
        logs = get_model("Data Import Log").objects.filter(data_import=name)
        self.assertEqual(logs.count(), 2)
        listed = self.client.get("/api/crm/data-imports/logs/", {"data_import": name}).json()
        self.assertEqual([entry["success"] for entry in listed], [True, True])
        self.assertEqual(
            sorted(get_model("Contact").objects.filter(first_name__in=["Ann", "Bob"]).values_list("first_name", flat=True)),
            ["Ann", "Bob"],
        )
        default_storage.delete(path)
