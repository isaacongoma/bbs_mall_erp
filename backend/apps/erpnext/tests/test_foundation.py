import json
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command
from django.test import Client, TestCase

from apps.core.models import User
from apps.erpnext.tests.meta_patch import meta_for
from apps.erpnext.registry import get_meta, get_model
from apps.frappe import exceptions, session
from apps.frappe.runtime import local
from apps.frappe.models import HasRole, UserPermission
import frappe
from apps.frappe import get_doc, new_doc
from apps.frappe.permissions import get_permitted_fields, has_permission, has_user_permission


class ErpnextFoundationTests(TestCase):
    def setUp(self):
        session.user = 'Administrator'
        self.user = User.objects.create_user(
            username="erpnext-test",
            email="erpnext-test@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="erpnext-test-hr-user", parent=self.user.email, role="HR User")

    def test_pilot_doctype_meta_matches_copied_vendor_json(self):
        meta = get_meta("Branch")
        path = Path(settings.BASE_DIR) / "apps" / "erpnext" / "setup" / "doctype" / "branch" / "branch.json"
        with path.open(encoding="utf-8") as handle:
            source = json.load(handle)
        self.assertEqual(meta["name"], source["name"])
        self.assertEqual(meta["fields"], source["fields"])
        self.assertEqual(meta["permissions"], source["permissions"])

    def test_generate_doctypes_is_idempotent_for_pilot_set(self):
        generated = Path(settings.BASE_DIR) / "apps" / "erpnext" / "generated_models.py"
        before = generated.read_text(encoding="utf-8")
        call_command("generate_doctypes", "pilot", verbosity=0)
        after = generated.read_text(encoding="utf-8")
        self.assertEqual(after, before)

    def test_document_insert_save_reload_delete_round_trip(self):
        doc = new_doc("Branch")
        doc.branch = "Enterprise Branch"
        doc.insert()

        model = get_model("Branch")
        self.assertTrue(model.objects.filter(pk="Enterprise Branch").exists())

        loaded = get_doc("Branch", "Enterprise Branch")
        loaded.branch = "Enterprise Branch"
        loaded.save()
        self.assertEqual(get_doc("Branch", "Enterprise Branch").branch, "Enterprise Branch")

        loaded.delete()
        self.assertFalse(model.objects.filter(pk="Enterprise Branch").exists())

    def test_mandatory_and_unique_validation(self):
        with self.assertRaisesMessage(Exception, "Branch is required"):
            new_doc("Branch").insert()

        first = new_doc("Branch")
        first.branch = "Unique Branch"
        first.insert()

        duplicate = new_doc("Branch")
        duplicate.branch = "Unique Branch"
        with self.assertRaisesMessage(Exception, "Branch must be unique"):
            duplicate.insert()

    def test_link_validation_uses_frappe_error_shape(self):
        category = new_doc("UOM Category")
        category.category_name = "Existing Category"
        category.insert()
        doc = new_doc("UOM Conversion Factor")
        doc.category = category.name
        doc.from_uom = "Missing UOM"
        doc.to_uom = "Missing UOM"
        doc.value = 1
        with self.assertRaisesMessage(Exception, "Could not find From: Missing UOM, To: Missing UOM"):
            doc.insert()

    def test_rest_create_detail_update_and_meta(self):
        client = Client(SERVER_NAME="localhost")
        client.force_login(self.user)

        meta_response = client.get("/api/erpnext/doctype/Branch/meta/")
        self.assertEqual(meta_response.status_code, 200)
        self.assertEqual(meta_response.json()["name"], "Branch")

        create_response = client.post(
            "/api/erpnext/doc/",
            data=json.dumps({"doctype": "Branch", "branch": "REST Branch"}),
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 200)
        self.assertEqual(create_response.json()["name"], "REST Branch")

        detail_response = client.get("/api/erpnext/doc/Branch/REST Branch/")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["branch"], "REST Branch")

        update_response = client.patch(
            "/api/erpnext/doc/Branch/REST Branch/",
            data=json.dumps({"branch": "REST Branch"}),
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 200)

    def test_rest_denies_user_without_required_role(self):
        user = User.objects.create_user(
            username="erpnext-no-role",
            email="erpnext-no-role@bbs-erp.local",
            password="admin",
        )
        client = Client(SERVER_NAME="localhost")
        client.force_login(user)

        self.assertEqual(client.get("/api/erpnext/doctype/Branch/meta/").status_code, 403)
        response = client.post(
            "/api/erpnext/doc/",
            data=json.dumps({"doctype": "Branch", "branch": "Denied Branch"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        branch = new_doc("Branch")
        branch.branch = "Controller Denied Branch"
        branch.insert(ignore_permissions=True)
        self.assertEqual(client.get(f"/api/erpnext/doc/Branch/{branch.name}/").status_code, 403)

    def test_rest_allows_user_with_required_role(self):
        client = Client(SERVER_NAME="localhost")
        client.force_login(self.user)

        self.assertEqual(client.get("/api/erpnext/doctype/Branch/meta/").status_code, 200)
        response = client.post(
            "/api/erpnext/doc/",
            data=json.dumps({"doctype": "Branch", "branch": "Allowed Branch"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)

    def test_document_engine_denies_insert_without_permission(self):
        user = User.objects.create_user(
            username="engine-no-role",
            email="engine-no-role@bbs-erp.local",
            password="admin",
        )
        session.user = user.email
        doc = new_doc("Branch")
        doc.branch = "Engine Denied Branch"

        with self.assertRaisesMessage(Exception, "Not permitted to create Branch"):
            doc.insert()
        session.user = "Administrator"

    def test_docshare_allows_document_read_without_role(self):
        branch = new_doc("Branch")
        branch.branch = "Shared Branch"
        branch.insert(ignore_permissions=True)
        user = User.objects.create_user(
            username="shared-user",
            email="shared-user@bbs-erp.local",
            password="admin",
        )
        get_model("DocShare").objects.create(name="foundation-branch-share", user=user.email, share_doctype="Branch", share_name=branch.name, read=1)

        session.user = user.email
        loaded = get_doc("Branch", branch.name)
        self.assertEqual(loaded.name, branch.name)
        session.user = "Administrator"

    def test_user_permission_filters_list_and_detail(self):
        allowed = new_doc("Branch")
        allowed.branch = "Allowed User Permission Branch"
        allowed.insert(ignore_permissions=True)
        denied = new_doc("Branch")
        denied.branch = "Denied User Permission Branch"
        denied.insert(ignore_permissions=True)

        user = User.objects.create_user(
            username="restricted-user",
            email="restricted-user@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="restricted-user-hr-user", parent=user.email, role="HR User")
        UserPermission.objects.create(
            name="restricted-user-branch",
            user=user.email,
            allow="Branch",
            for_value=allowed.name,
            applicable_for="Branch",
        )

        client = Client(SERVER_NAME="localhost")
        client.force_login(user)
        rows = client.get("/api/erpnext/doc/Branch/").json()
        self.assertEqual([row["name"] for row in rows], [allowed.name])
        self.assertEqual(client.get(f"/api/erpnext/doc/Branch/{allowed.name}/").status_code, 200)
        self.assertEqual(client.get(f"/api/erpnext/doc/Branch/{denied.name}/").status_code, 403)

    def test_permlevel_field_masking(self):
        user = User.objects.create_user(
            username="permlevel-user",
            email="permlevel-user@bbs-erp.local",
            password="admin",
        )
        meta = {
            "fields": [
                {"fieldname": "public_field", "permlevel": 0},
                {"fieldname": "private_field", "permlevel": 1},
            ],
            "permissions": [
                {"role": "HR User", "read": 1, "permlevel": 0},
            ],
        }
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Patched DocType", meta)):
            HasRole.objects.create(name="permlevel-user-hr", parent=user.email, role="HR User")
            fields = get_permitted_fields("Patched DocType", user=user.email)
        self.assertIn("public_field", fields)
        self.assertNotIn("private_field", fields)

        meta["permissions"].append({"role": "HR User", "read": 1, "permlevel": 1})
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Patched DocType", meta)):
            fields = get_permitted_fields("Patched DocType", user=user.email)
        self.assertIn("private_field", fields)

    def test_permlevel_above_zero_does_not_grant_document_access(self):
        user = User.objects.create_user(
            username="permlevel-access-user",
            email="permlevel-access-user@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="permlevel-access-user-hr", parent=user.email, role="HR User")
        meta = {
            "fields": [],
            "permissions": [
                {"role": "HR User", "read": 1, "permlevel": 1},
            ],
        }
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Patched DocType", meta)):
            self.assertFalse(has_permission("Patched DocType", "read", user=user.email))

        meta["permissions"].append({"role": "HR User", "read": 1, "permlevel": 0})
        local.role_permissions.clear()
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Patched DocType", meta)):
            self.assertTrue(has_permission("Patched DocType", "read", user=user.email))

    def test_user_permission_multiple_values_are_or_for_list_and_detail(self):
        allowed_a = new_doc("Branch")
        allowed_a.branch = "Allowed User Permission Branch A"
        allowed_a.insert(ignore_permissions=True)
        allowed_b = new_doc("Branch")
        allowed_b.branch = "Allowed User Permission Branch B"
        allowed_b.insert(ignore_permissions=True)
        denied = new_doc("Branch")
        denied.branch = "Denied User Permission Branch B"
        denied.insert(ignore_permissions=True)

        user = User.objects.create_user(
            username="restricted-two-values",
            email="restricted-two-values@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="restricted-two-values-hr", parent=user.email, role="HR User")
        UserPermission.objects.create(
            name="restricted-two-values-a",
            user=user.email,
            allow="Branch",
            for_value=allowed_a.name,
            applicable_for="Branch",
            is_default=1,
        )
        UserPermission.objects.create(
            name="restricted-two-values-b",
            user=user.email,
            allow="Branch",
            for_value=allowed_b.name,
            applicable_for="Branch",
        )

        client = Client(SERVER_NAME="localhost")
        client.force_login(user)
        rows = client.get("/api/erpnext/doc/Branch/").json()
        self.assertEqual({row["name"] for row in rows}, {allowed_a.name, allowed_b.name})
        self.assertEqual(client.get(f"/api/erpnext/doc/Branch/{allowed_a.name}/").status_code, 200)
        self.assertEqual(client.get(f"/api/erpnext/doc/Branch/{allowed_b.name}/").status_code, 200)
        self.assertEqual(client.get(f"/api/erpnext/doc/Branch/{denied.name}/").status_code, 403)

    def test_user_permission_applicable_for_limits_restriction(self):
        allowed = new_doc("Branch")
        allowed.branch = "Applicable For Branch A"
        allowed.insert(ignore_permissions=True)
        other = new_doc("Branch")
        other.branch = "Applicable For Branch B"
        other.insert(ignore_permissions=True)
        user = User.objects.create_user(
            username="applicable-for-user",
            email="applicable-for-user@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="applicable-for-user-hr", parent=user.email, role="HR User")
        UserPermission.objects.create(
            name="applicable-for-other-doctype",
            user=user.email,
            allow="Branch",
            for_value=allowed.name,
            applicable_for="Customer Group",
        )

        client = Client(SERVER_NAME="localhost")
        client.force_login(user)
        names = {row["name"] for row in client.get("/api/erpnext/doc/Branch/").json()}
        self.assertIn(allowed.name, names)
        self.assertIn(other.name, names)

    def test_ignore_user_permissions_link_field_is_not_restricted(self):
        user = User.objects.create_user(
            username="ignore-user-perms-field",
            email="ignore-user-perms-field@bbs-erp.local",
            password="admin",
        )
        UserPermission.objects.create(
            name="ignore-user-perms-branch",
            user=user.email,
            allow="Branch",
            for_value="Allowed Branch",
            applicable_for="Patched DocType",
        )
        meta = {
            "fields": [
                {
                    "fieldname": "ignored_branch",
                    "fieldtype": "Link",
                    "options": "Branch",
                    "ignore_user_permissions": 1,
                }
            ],
            "permissions": [],
            "module": "Setup",
        }
        doc = frappe.get_doc({"doctype": "Branch", "branch": "Example", "ignored_branch": "Denied Branch"})
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Branch", meta)):
            self.assertTrue(has_user_permission(doc, user=user.email))

    def test_user_permission_tree_descendants_respect_hide_descendants(self):
        parent = new_doc("Customer Group")
        parent.customer_group_name = "Parent Customer Group"
        parent.is_group = 1
        parent.insert(ignore_permissions=True)
        child = new_doc("Customer Group")
        child.customer_group_name = "Child Customer Group"
        child.parent_customer_group = parent.name
        child.insert(ignore_permissions=True)
        model = get_model("Customer Group")
        model.objects.filter(pk=parent.name).update(lft=1000, rgt=1003)
        model.objects.filter(pk=child.name).update(lft=1001, rgt=1002)

        user = User.objects.create_user(
            username="tree-user-perms",
            email="tree-user-perms@bbs-erp.local",
            password="admin",
        )
        HasRole.objects.create(name="tree-user-perms-sales", parent=user.email, role="Sales Manager")
        UserPermission.objects.create(
            name="tree-user-perms-parent",
            user=user.email,
            allow="Customer Group",
            for_value=parent.name,
            applicable_for="Customer Group",
            hide_descendants=0,
        )
        client = Client(SERVER_NAME="localhost")
        client.force_login(user)
        names = {row["name"] for row in client.get("/api/erpnext/doc/Customer Group/").json()}
        self.assertEqual(names, {parent.name, child.name})

        UserPermission.objects.filter(name="tree-user-perms-parent").update(hide_descendants=1)
        names = {row["name"] for row in client.get("/api/erpnext/doc/Customer Group/").json()}
        self.assertEqual(names, {parent.name})

    def test_unauthenticated_request_is_rejected(self):
        client = Client(SERVER_NAME="localhost")
        response = client.get("/api/erpnext/doctype/Branch/meta/")
        self.assertEqual(response.status_code, 401)


    def test_document_engine_set_only_once_blocks_existing_value_change(self):
        doc = new_doc("Branch")
        doc.branch = "Set Once Branch"
        doc.insert(ignore_permissions=True)
        doc.branch = "Set Once Branch Changed"
        meta = {
            "fields": [{"fieldname": "branch", "fieldtype": "Data", "set_only_once": 1, "label": "Branch"}],
            "permissions": [],
            "module": "Setup",
        }
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Branch", meta)):
            with self.assertRaises(exceptions.CannotChangeConstantError):
                doc.save(ignore_permissions=True)

    def test_document_engine_update_after_submit_requires_allow_on_submit(self):
        doc = new_doc("Branch")
        doc.branch = "Submitted Branch"
        doc.insert(ignore_permissions=True)
        doc.docstatus = 1
        doc.save(ignore_permissions=True)

        doc.branch = "Submitted Branch Blocked"
        with self.assertRaises(exceptions.UpdateAfterSubmitError):
            doc.save(ignore_permissions=True)

        meta = {
            "fields": [{"fieldname": "branch", "fieldtype": "Data", "allow_on_submit": 1}],
            "permissions": [],
            "module": "Setup",
        }
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("Branch", meta)):
            doc.save(ignore_permissions=True)
        self.assertEqual(get_doc("Branch", doc.name).branch, "Submitted Branch Blocked")

    def test_document_engine_fetch_from_and_db_set(self):
        uom = new_doc("UOM")
        uom.uom_name = "Fetch Source UOM"
        uom.category = "Weight"
        uom.insert(ignore_permissions=True, ignore_links=True)

        meta = {
            "fields": [
                {"fieldname": "category", "fieldtype": "Data", "reqd": 1, "fetch_from": "from_uom.category"},
                {"fieldname": "from_uom", "fieldtype": "Link", "options": "UOM", "reqd": 1},
                {"fieldname": "to_uom", "fieldtype": "Link", "options": "UOM", "reqd": 1},
                {"fieldname": "value", "fieldtype": "Float", "reqd": 1},
            ],
            "permissions": [],
            "module": "Setup",
            "autoname": "MAT-UOM-CNV-.#####",
        }
        doc = new_doc("UOM Conversion Factor")
        doc.from_uom = uom.name
        doc.to_uom = uom.name
        doc.value = 1
        with patch("apps.erpnext.registry.get_meta", side_effect=meta_for("UOM Conversion Factor", meta)):
            doc.insert(ignore_permissions=True)
        self.assertEqual(doc.category, "Weight")

        doc.db_set("value", 2, update_modified=False)
        self.assertEqual(get_doc("UOM Conversion Factor", doc.name).value, 2)

    def test_document_engine_runs_doc_events_hooks(self):
        calls = []

        def handler(doc, method):
            calls.append((doc.doctype, method))

        with patch("apps.frappe.runtime.get_doc_hooks", return_value={"Branch": {"before_validate": [handler]}}):
            doc = new_doc("Branch")
            doc.branch = "Doc Events Branch"
            doc.insert(ignore_permissions=True)

        self.assertIn(("Branch", "before_validate"), calls)

    def test_document_engine_respects_ignore_permissions(self):
        user = User.objects.create_user(
            username="engine-ignore-permissions",
            email="engine-ignore-permissions@bbs-erp.local",
            password="admin",
        )
        session.user = user.email
        doc = new_doc("Branch")
        doc.branch = "Ignore Permission Branch"
        doc.insert(ignore_permissions=True)
        self.assertEqual(doc.name, "Ignore Permission Branch")
        session.user = "Administrator"

    def test_jwt_authentication_valid_token(self):
        from rest_framework_simplejwt.tokens import AccessToken
        token = str(AccessToken.for_user(self.user))
        client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")

        self.assertEqual(client.get("/api/erpnext/doctype/Branch/meta/").status_code, 200)

        create_res = client.post(
            "/api/erpnext/doc/",
            data=json.dumps({"doctype": "Branch", "branch": "JWT Valid Branch"}),
            content_type="application/json"
        )
        self.assertEqual(create_res.status_code, 200)

        self.assertEqual(client.get("/api/erpnext/doc/Branch/JWT Valid Branch/").status_code, 200)

        update_res = client.patch(
            "/api/erpnext/doc/Branch/JWT Valid Branch/",
            data=json.dumps({"branch": "JWT Valid Branch"}),
            content_type="application/json"
        )
        self.assertEqual(update_res.status_code, 200)

        self.assertEqual(client.get("/api/erpnext/doc/Branch/").status_code, 200)

        submit_res = client.post("/api/erpnext/doc/Branch/JWT Valid Branch/submit/")
        self.assertEqual(submit_res.status_code, 403)
        cancel_res = client.post("/api/erpnext/doc/Branch/JWT Valid Branch/cancel/")
        self.assertEqual(cancel_res.status_code, 403)

    def test_jwt_authentication_invalid_token(self):
        client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION="Bearer invalidtoken")
        self.assertEqual(client.get("/api/erpnext/doctype/Branch/meta/").status_code, 401)

    def test_jwt_authentication_missing_token(self):
        client = Client(SERVER_NAME="localhost")
        self.assertEqual(client.get("/api/erpnext/doctype/Branch/meta/").status_code, 401)

    def test_jwt_authentication_no_role(self):
        from rest_framework_simplejwt.tokens import AccessToken
        user_no_role = User.objects.create_user(
            username="jwt-no-role",
            email="jwt-no-role@bbs-erp.local",
            password="admin",
        )
        token = str(AccessToken.for_user(user_no_role))
        client = Client(SERVER_NAME="localhost", HTTP_AUTHORIZATION=f"Bearer {token}")
        
        self.assertEqual(client.get("/api/erpnext/doctype/Branch/meta/").status_code, 403)
        create_res = client.post(
            "/api/erpnext/doc/",
            data=json.dumps({"doctype": "Branch", "branch": "JWT No Role Branch"}),
            content_type="application/json"
        )
        self.assertEqual(create_res.status_code, 403)

    def test_jwt_authentication_does_not_leak_session_user(self):
        from rest_framework_simplejwt.tokens import AccessToken
        token1 = str(AccessToken.for_user(self.user))
        
        user2 = User.objects.create_user(
            username="jwt-leak-user",
            email="jwt-leak-user@bbs-erp.local",
            password="admin",
        )
        token2 = str(AccessToken.for_user(user2))

        client = Client(SERVER_NAME="localhost")
        
        res1 = client.get("/api/erpnext/doctype/Branch/meta/", HTTP_AUTHORIZATION=f"Bearer {token1}")
        self.assertEqual(res1.status_code, 200)

        res2 = client.get("/api/erpnext/doctype/Branch/meta/", HTTP_AUTHORIZATION=f"Bearer {token2}")
        self.assertEqual(res2.status_code, 403)
        
        self.assertEqual(session.user, "Administrator")
