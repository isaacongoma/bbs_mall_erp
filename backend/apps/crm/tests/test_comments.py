import json

from django.test import Client, TestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.models import User
from apps.crm.activities_api import _comment_activities
from apps.crm.comment_api import add_comment
from apps.erpnext.registry import get_model
from apps.frappe import session


class CommentUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.user = User.objects.create_user(username="c1", email="c1@bbs-erp.local", password="x")
        token = str(AccessToken.for_user(self.user))
        self.client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_add_comment_is_stored_in_the_canonical_table(self):
        payload = add_comment("CRM Lead", "LEAD-1", "<p>hello</p>", self.user)
        stored = get_model("Comment").objects.get(pk=payload["name"])
        self.assertEqual(stored.content, "<p>hello</p>")
        self.assertEqual(stored.comment_type, "Comment")
        self.assertEqual(stored.owner, self.user.email)
        self.assertEqual(payload["owner"], self.user.pk)

    def test_activities_list_only_comments_with_user_pk_owner(self):
        add_comment("CRM Lead", "LEAD-1", "first", self.user)
        get_model("Comment").objects.create(
            name="x-view", comment_type="Info", reference_doctype="CRM Lead", reference_name="LEAD-1", content="noise"
        )
        rows = _comment_activities("CRM Lead", "LEAD-1")
        self.assertEqual([row["content"] for row in rows], ["first"])
        self.assertEqual(rows[0]["owner"], self.user.pk)

    def test_comment_endpoint_round_trip(self):
        created = self.client.post(
            "/api/crm/comments/",
            data=json.dumps({"reference_doctype": "CRM Lead", "reference_name": "LEAD-2", "content": "one"}),
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        name = created.json()["id"]
        self.assertEqual(created.json()["owner"], self.user.pk)
        listing = self.client.get("/api/crm/comments/", {"reference_name": "LEAD-2"})
        self.assertEqual([row["content"] for row in listing.json().get("results", listing.json())], ["one"])
        updated = self.client.patch(
            f"/api/crm/comments/{name}/", data=json.dumps({"content": "two"}), content_type="application/json"
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(get_model("Comment").objects.get(pk=name).content, "two")
        deleted = self.client.delete(f"/api/crm/comments/{name}/")
        self.assertEqual(deleted.status_code, 204, deleted.content)
        self.assertFalse(get_model("Comment").objects.filter(pk=name).exists())


class UploadUnificationTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.user = User.objects.create_user(username="u1", email="u1@bbs-erp.local", password="x")
        token = str(AccessToken.for_user(self.user))
        self.client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_upload_is_stored_in_the_canonical_file_table_and_listed_as_attachment(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from apps.crm.activities_api import _attachments

        response = self.client.post(
            "/api/method/upload_file",
            {
                "file": SimpleUploadedFile("note.txt", b"hello"),
                "doctype": "CRM Lead",
                "docname": "LEAD-9",
                "is_private": "1",
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        message = response.json()["message"]
        stored = get_model("File").objects.get(pk=message["name"])
        self.assertEqual(stored.owner, self.user.email)
        self.assertEqual(stored.file_size, 5)
        self.assertEqual(message["is_private"], True)
        listed = _attachments("CRM Lead", "LEAD-9")
        self.assertEqual([item["file_name"] for item in listed], ["note.txt"])
        self.assertEqual(listed[0]["owner"], self.user.pk)
        self.assertEqual(listed[0]["file_size"], 5)
