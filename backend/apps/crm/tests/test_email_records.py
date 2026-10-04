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
