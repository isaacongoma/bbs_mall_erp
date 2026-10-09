import json

from django.test import Client, TestCase
from rest_framework_simplejwt.tokens import AccessToken

from apps.core.crm_custom_fields import install_crm_custom_fields

from apps.core.assignable import AssignableMixin
from apps.core.assignments import assigned_user_pks, assignees_by_name
from apps.core.doctype.assignment_rule import assignment_rule_engine as engine
from apps.core.models import User
from apps.crm import doc_api
from apps.erpnext.registry import get_model
from apps.frappe import session


class Subject(AssignableMixin):
    doctype_label = "CRM Lead"
    pk = "LEAD-7"


class AssignmentStoreTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        self.a = User.objects.create_user(username="a", email="a@bbs-erp.local", password="x")
        self.b = User.objects.create_user(username="b", email="b@bbs-erp.local", password="x")

    def todos(self):
        return get_model("ToDo").objects.filter(reference_type="CRM Lead", reference_name="LEAD-7")

    def test_mixin_assign_is_idempotent_and_stored_canonically(self):
        subject = Subject()
        subject.assign_agent(self.a)
        subject.assign_agent(self.a)
        rows = list(self.todos())
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].allocated_to, self.a.email)
        self.assertEqual(rows[0].status, "Open")
        self.assertEqual(subject.get_assigned_users(), [self.a.pk])

    def test_mixin_unassign_cancels(self):
        subject = Subject()
        subject.assign_agent(self.a)
        subject.unassign_agent(self.a)
        self.assertEqual(self.todos().get().status, "Cancelled")
        self.assertEqual(subject.get_assigned_users(), [])

    def test_assign_to_add_remove_and_virtual_assign_field(self):
        doc_api.assign_to_add("CRM Lead", "LEAD-7", [self.a.pk, self.b.pk])
        self.assertEqual(sorted(assigned_user_pks("CRM Lead", "LEAD-7")), sorted([self.a.pk, self.b.pk]))
        values = doc_api._virtual_field_values("CRM Lead", ["LEAD-7"], {"_assign"})
        self.assertEqual(sorted(json.loads(values["LEAD-7"]["_assign"])), sorted([self.a.pk, self.b.pk]))
        doc_api.remove_assignments("CRM Lead", "LEAD-7", [self.a.pk])
        self.assertEqual(assigned_user_pks("CRM Lead", "LEAD-7"), [self.b.pk])
        self.assertEqual(doc_api.get_assigned_users("CRM Lead", "LEAD-7"), [self.b.pk])
        doc_api.assign_to_remove_multiple("CRM Lead", ["LEAD-7"])
        self.assertEqual(assignees_by_name("CRM Lead", ["LEAD-7"]), {})

    def api(self):
        token = str(AccessToken.for_user(self.a))
        return Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_assignment_rule_api_and_engine_state_machine(self):
        install_crm_custom_fields()
        client = self.api()
        created = client.post(
            "/api/crm/assignment-rules/",
            data=json.dumps(
                {
                    "name": "Lead rr", "document_type": "CRM Lead", "rule": "Load Balancing", "assign_condition": "True",
                    "close_condition": "status == 'Done'", "description": "auto",
                    "users": [self.a.email, self.b.email], "assignment_days": [{"day": "Monday"}],
                    "assign_condition_json": "{}",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201, created.content)
        body = created.json()
        self.assertEqual([row["user"] for row in body["users"]], [self.a.email, self.b.email])
        self.assertEqual(body["assignment_days"], [{"day": "Monday"}])
        self.assertEqual(body["assign_condition_json"], "{}")
        listing = client.get("/api/crm/assignment-rules-list/").json()
        self.assertEqual(listing, [{"name": "Lead rr", "description": "auto", "disabled": False, "priority": 0, "users_exists": True}])
        patched = client.patch(
            "/api/crm/assignment-rules/Lead rr/",
            data=json.dumps({"assignment_days": [], "disabled": False}),
            content_type="application/json",
        )
        self.assertEqual(patched.status_code, 200, patched.content)
        self.assertEqual(patched.json()["assignment_days"], [])
        doc_api.assign_to_add("CRM Lead", "LEAD-OTHER", [self.a.pk])
        engine.apply_assignment_rules("CRM Lead", "LEAD-7", {"status": "New"})
        row = self.todos().get()
        self.assertEqual(row.allocated_to, self.b.email)
        self.assertEqual(row.assignment_rule, "Lead rr")
        engine.apply_assignment_rules("CRM Lead", "LEAD-7", {"status": "Done"})
        self.assertEqual(self.todos().get().status, "Closed")
        engine.apply_assignment_rules("CRM Lead", "LEAD-7", {"status": "New"})
        self.assertEqual(self.todos().get().status, "Open")
        duplicated = client.post(
            "/api/crm/assignment-rules-duplicate/",
            data=json.dumps({"docname": "Lead rr", "new_name": "Lead rr copy"}),
            content_type="application/json",
        )
        self.assertEqual(duplicated.status_code, 200, duplicated.content)
        self.assertEqual([row["user"] for row in duplicated.json()["users"]], [self.a.email, self.b.email])
        self.assertEqual(client.delete("/api/crm/assignment-rules/Lead rr copy/").status_code, 204)
        self.assertFalse(get_model("Assignment Rule User").objects.filter(parent="Lead rr copy").exists())

    def test_round_robin_and_weighted_distribution(self):
        install_crm_custom_fields()
        client = self.api()
        client.post(
            "/api/crm/assignment-rules/",
            data=json.dumps(
                {"name": "RR", "document_type": "CRM Lead", "rule": "Round Robin", "assign_condition": "True", "users": [self.a.email, self.b.email]}
            ),
            content_type="application/json",
        )
        owners = []
        for number in range(3):
            engine.apply_assignment_rules("CRM Lead", f"RR-{number}", {})
            owners.append(get_model("ToDo").objects.get(reference_name=f"RR-{number}", status="Open").allocated_to)
        self.assertEqual(owners, [self.a.email, self.b.email, self.a.email])
