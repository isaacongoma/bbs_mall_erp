from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core import login_flow
from apps.core.models import User


def make_user(email="otp@example.com", mobile="0712345678", password="Str0ng-Pass-123"):
    user = User(email=email, username=email, mobile_no=mobile, is_active=True)
    user.set_password(password)
    user.save()
    return user


@override_settings(LOGIN_OTP_ENABLED=True)
class LoginFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.sent = []

        def fake_send(phone, code):
            self.sent.append((phone, code))
            return True

        patches = [
            mock.patch.object(login_flow, "send_sms_code", side_effect=fake_send),
            mock.patch.object(login_flow, "sms_ready", return_value=True),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def test_password_then_code_issues_tokens(self):
        make_user()
        response = self.client.post("/api/auth/login/", {"email": "otp@example.com", "password": "Str0ng-Pass-123"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["otp_required"])
        self.assertEqual(response.data["length"], 6)
        challenge = response.data["challenge"]
        code = self.sent[-1][1]
        wrong = self.client.post("/api/auth/otp/verify/", {"challenge": challenge, "code": "000000" if code != "000000" else "111111"}, format="json")
        self.assertEqual(wrong.status_code, 400)
        ok = self.client.post("/api/auth/otp/verify/", {"challenge": challenge, "code": code}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertIn("access", ok.data)

    def test_wrong_password_rejected(self):
        make_user()
        response = self.client.post("/api/auth/login/", {"email": "otp@example.com", "password": "nope"}, format="json")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.sent, [])

    def test_code_locks_after_attempts(self):
        make_user()
        response = self.client.post("/api/auth/login/", {"email": "otp@example.com", "password": "Str0ng-Pass-123"}, format="json")
        challenge = response.data["challenge"]
        real = self.sent[-1][1]
        bad = "123456" if real != "123456" else "654321"
        for _ in range(login_flow.OTP_MAX_ATTEMPTS):
            self.client.post("/api/auth/otp/verify/", {"challenge": challenge, "code": bad}, format="json")
        locked = self.client.post("/api/auth/otp/verify/", {"challenge": challenge, "code": real}, format="json")
        self.assertEqual(locked.status_code, 400)

    def test_no_phone_skips_code(self):
        make_user(email="nophone@example.com", mobile="")
        response = self.client.post("/api/auth/login/", {"email": "nophone@example.com", "password": "Str0ng-Pass-123"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def test_forgot_password_resets_with_code(self):
        user = make_user()
        started = self.client.post("/api/auth/forgot/", {"identifier": "otp@example.com"}, format="json")
        self.assertEqual(started.status_code, 200)
        code = self.sent[-1][1]
        verified = self.client.post("/api/auth/forgot/verify/", {"challenge": started.data["challenge"], "code": code}, format="json")
        self.assertEqual(verified.status_code, 200)
        weak = self.client.post("/api/auth/forgot/reset/", {"reset_token": verified.data["reset_token"], "password": "123"}, format="json")
        self.assertEqual(weak.status_code, 400)
        done = self.client.post("/api/auth/forgot/reset/", {"reset_token": verified.data["reset_token"], "password": "Another-Str0ng-9"}, format="json")
        self.assertEqual(done.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("Another-Str0ng-9"))

    def test_forgot_password_unknown_user_does_not_reveal(self):
        response = self.client.post("/api/auth/forgot/", {"identifier": "ghost@example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.sent, [])
        self.assertIn("challenge", response.data)

    def test_forgot_password_by_phone(self):
        make_user()
        response = self.client.post("/api/auth/forgot/", {"identifier": "+254 712 345 678"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.sent), 1)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="")
    def test_google_requires_configuration(self):
        response = self.client.post("/api/auth/google/", {"credential": "x"}, format="json")
        self.assertEqual(response.status_code, 503)

    @override_settings(GOOGLE_OAUTH_CLIENT_ID="client-id")
    def test_google_login_matches_existing_user_only(self):
        make_user(email="g@example.com")
        with mock.patch("google.oauth2.id_token.verify_oauth2_token", return_value={"email": "g@example.com", "email_verified": True}):
            ok = self.client.post("/api/auth/google/", {"credential": "token"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertIn("access", ok.data)
        with mock.patch("google.oauth2.id_token.verify_oauth2_token", return_value={"email": "stranger@example.com", "email_verified": True}):
            denied = self.client.post("/api/auth/google/", {"credential": "token"}, format="json")
        self.assertEqual(denied.status_code, 403)

    def test_config_is_public(self):
        response = self.client.get("/api/auth/config/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["passkeys"])

    def test_passkey_endpoints_require_auth_for_registration(self):
        self.assertIn(self.client.post("/api/auth/passkeys/register/options/").status_code, (401, 403))
        options = self.client.post("/api/auth/passkey/options/")
        self.assertEqual(options.status_code, 200)
        self.assertIn("challenge", options.data["options"])
