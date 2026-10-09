import json

from django.test import Client, TestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.core import contacts
from apps.core.models import User
from apps.crm import search_api, telephony_utils
from apps.crm.doctype.deal.deal import contact_exists, create_contact
from apps.erpnext.registry import get_model
from apps.frappe import session


class ContactUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.user = User.objects.create_user(username="ct1", email="ct1@bbs-erp.local", password="x")
        token = str(AccessToken.for_user(self.user))
        self.client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def post(self, url, payload):
        return self.client.post(url, data=json.dumps(payload), content_type="application/json")

    def test_create_contact_stores_rows_in_the_canonical_tables(self):
        contact = contacts.create_contact(
            first_name="Jane", last_name="Doe", email="jane@x.com", phone="0201", mobile_no="0712345678"
        )
        self.assertEqual(contact.full_name, "Jane Doe")
        self.assertEqual(contact.email_id, "jane@x.com")
        self.assertEqual(contact.mobile_no, "0712345678")
        self.assertEqual(contact.phone, "0201")
        self.assertEqual([row.email_id for row in contacts.email_rows(contact.name)], ["jane@x.com"])
        self.assertEqual(
            sorted(row.phone for row in contacts.phone_rows(contact.name)), ["0201", "0712345678"]
        )
        self.assertEqual(contacts.find_by_email("jane@x.com").name, contact.name)
        self.assertEqual(contacts.find_by_phone("0712345678").name, contact.name)
        self.assertEqual(contacts.find_by_phone("12345", partial=True).name, contact.name)

    def test_deal_helpers_reuse_an_existing_contact(self):
        baseline = get_model("Contact").objects.count()
        first = create_contact({"first_name": "A", "last_name": "B", "email": "ab@x.com", "mobile_no": "0799"})
        again = create_contact({"first_name": "Other", "email": "ab@x.com"})
        self.assertEqual(first.name, again.name)
        self.assertEqual(contact_exists({"mobile_no": "0799"}).name, first.name)
        self.assertEqual(get_model("Contact").objects.count(), baseline + 1)

    def test_endpoints_add_email_phone_and_change_primary(self):
        contact = contacts.create_contact(first_name="Sam", email="sam@x.com")
        added = self.post("/api/crm/contact-create-new/", {"contact": contact.name, "field": "email", "value": "sam2@x.com"})
        self.assertEqual(added.status_code, 200, added.content)
        self.post("/api/crm/contact-create-new/", {"contact": contact.name, "field": "mobile_no", "value": "0700"})
        switched = self.post(
            "/api/crm/contact-set-primary/", {"contact": contact.name, "field": "email", "value": "sam2@x.com"}
        )
        self.assertEqual(switched.status_code, 200, switched.content)
        body = self.client.get(f"/api/crm/contacts/{contact.name}/").json()
        self.assertEqual(body["email_id"], "sam2@x.com")
        self.assertEqual(body["mobile_no"], "0700")
        self.assertEqual({row["email_id"]: row["is_primary"] for row in body["email_ids"]}, {"sam@x.com": False, "sam2@x.com": True})

    def test_contact_rest_round_trip_search_and_telephony(self):
        created = self.post(
            "/api/crm/contacts/", {"first_name": "Rest", "last_name": "User", "company_name": "Acme", "gender": "", "salutation": ""}
        )
        self.assertEqual(created.status_code, 201, created.content)
        name = created.json()["name"]
        self.assertEqual(created.json()["owner"], None)
        patched = self.client.patch(
            f"/api/crm/contacts/{name}/", data=json.dumps({"designation": "CTO"}), content_type="application/json"
        )
        self.assertEqual(patched.status_code, 200, patched.content)
        self.assertEqual(get_model("Contact").objects.get(pk=name).designation, "CTO")
        contacts.add_email(name, "rest@acme.com")
        contacts.add_phone(name, "0700111222", "mobile_no")
        self.assertEqual(search_api.search_emails("rest")[0][1], "rest@acme.com")
        resolved = telephony_utils.get_contact("0700111222")
        self.assertEqual(resolved.get("name"), name)
        self.assertEqual(self.client.delete(f"/api/crm/contacts/{name}/").status_code, 204)
        self.assertFalse(get_model("Contact").objects.filter(pk=name).exists())
        self.assertFalse(contacts.email_rows(name).exists())
