import base64
import secrets

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import PasskeyCredential

OTP_LENGTH = 6
OTP_TTL = 300
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = 30
RESET_TTL = 600
CHALLENGE_TTL = 300


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def throttled(key, limit, window):
    cache_key = f"login-throttle:{key}"
    count = cache.get(cache_key, 0)
    if count >= limit:
        return True
    cache.set(cache_key, count + 1, window)
    return False


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")) if forwarded else request.META.get("REMOTE_ADDR", "")


def too_many():
    return Response({"detail": "Too many attempts. Please wait and try again."}, status=status.HTTP_429_TOO_MANY_REQUESTS)


def b64url_encode(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def b64url_decode(value):
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def hash_code(challenge, code):
    return salted_hmac("login-otp", f"{challenge}:{code}").hexdigest()


def mask_phone(phone):
    digits = "".join(character for character in str(phone) if character.isdigit())
    return f"{digits[:4]}{'*' * max(len(digits) - 7, 0)}{digits[-3:]}" if len(digits) > 7 else "***"


def user_phone(user):
    return (user.mobile_no or user.phone or "").strip()


def sms_ready():
    from apps.frappe.runtime import session

    previous = getattr(session, "user", None)
    session.user = "Administrator"
    try:
        import frappe

        doc = frappe.get_doc("HostPinnacle Settings")
        return bool(doc.enabled)
    except Exception:
        return False
    finally:
        session.user = previous


def send_sms_code(phone, code):
    from apps.erpnext.erpnext_integrations.hostpinnacle.sms import send_sms
    from apps.frappe.runtime import session

    message = f"Your BBS Mall ERP verification code is {code}. It expires in {OTP_TTL // 60} minutes. Do not share it with anyone."
    previous = getattr(session, "user", None)
    session.user = "Administrator"
    try:
        return bool(send_sms([phone], message, success_msg=False))
    except Exception:
        return False
    finally:
        session.user = previous


def issue_challenge(user, purpose):
    phone = user_phone(user)
    challenge = secrets.token_urlsafe(24)
    code = "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))
    sent = send_sms_code(phone, code)
    if not sent:
        return None
    cache.set(
        f"login-otp:{challenge}",
        {
            "user": user.pk,
            "purpose": purpose,
            "hash": hash_code(challenge, code),
            "attempts": 0,
            "phone": mask_phone(phone),
            "sent_at": timezone.now().timestamp(),
        },
        OTP_TTL,
    )
    return {"challenge": challenge, "phone": mask_phone(phone), "length": OTP_LENGTH, "resend_in": OTP_RESEND_SECONDS}


def check_code(challenge, code, purpose):
    key = f"login-otp:{challenge}"
    state = cache.get(key)
    if not state or state["purpose"] != purpose:
        return None, "This code has expired. Request a new one."
    if state["attempts"] >= OTP_MAX_ATTEMPTS:
        cache.delete(key)
        return None, "Too many incorrect codes. Request a new one."
    if not constant_time_compare(state["hash"], hash_code(challenge, str(code).strip())):
        state["attempts"] += 1
        cache.set(key, state, OTP_TTL)
        return None, "Incorrect code."
    cache.delete(key)
    return get_user_model().objects.filter(pk=state["user"], is_active=True).first(), None


def find_user(identifier):
    value = str(identifier or "").strip()
    if not value:
        return None
    user_model = get_user_model()
    user = user_model.objects.filter(email__iexact=value, is_active=True).first()
    if user:
        return user
    digits = "".join(character for character in value if character.isdigit())
    if len(digits) >= 9:
        tail = digits[-9:]
        for candidate in user_model.objects.filter(is_active=True).exclude(mobile_no="").exclude(mobile_no__isnull=True):
            number = "".join(character for character in candidate.mobile_no if character.isdigit())
            if number.endswith(tail):
                return candidate
    return None


class PublicView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class ConfigView(PublicView):
    def get(self, request):
        return Response(
            {
                "google_client_id": settings.GOOGLE_OAUTH_CLIENT_ID or None,
                "passkeys": True,
                "otp": bool(settings.LOGIN_OTP_ENABLED),
                "otp_length": OTP_LENGTH,
            }
        )


class LoginView(PublicView):
    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        password = str(request.data.get("password", ""))
        if throttled(f"login-ip:{client_ip(request)}", 30, 300) or throttled(f"login-user:{email.lower()}", 10, 300):
            return too_many()
        user = authenticate(request, username=email, password=password)
        if user is None or not user.is_active:
            return Response({"detail": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)
        if settings.LOGIN_OTP_ENABLED and user_phone(user) and sms_ready():
            issued = issue_challenge(user, "login")
            if issued is None:
                return Response(
                    {"detail": "We could not send the verification code. Please try again."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response({"otp_required": True, **issued})
        return Response(tokens_for(user))


class OtpVerifyView(PublicView):
    def post(self, request):
        challenge = str(request.data.get("challenge", ""))
        if throttled(f"otp-ip:{client_ip(request)}", 60, 300):
            return too_many()
        user, error = check_code(challenge, request.data.get("code", ""), "login")
        if user is None:
            return Response({"detail": error or "Incorrect code."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(tokens_for(user))


class OtpResendView(PublicView):
    def post(self, request):
        challenge = str(request.data.get("challenge", ""))
        state = cache.get(f"login-otp:{challenge}")
        if not state:
            return Response({"detail": "This session has expired. Please start again."}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.now().timestamp() - state["sent_at"] < OTP_RESEND_SECONDS:
            return too_many()
        user = get_user_model().objects.filter(pk=state["user"], is_active=True).first()
        if user is None:
            return Response({"detail": "This session has expired. Please start again."}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(f"login-otp:{challenge}")
        issued = issue_challenge(user, state["purpose"])
        if issued is None:
            return Response(
                {"detail": "We could not send the verification code. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(issued)


class ForgotPasswordView(PublicView):
    def post(self, request):
        identifier = str(request.data.get("identifier", "")).strip()
        if throttled(f"forgot-ip:{client_ip(request)}", 10, 600) or throttled(f"forgot-user:{identifier.lower()}", 5, 600):
            return too_many()
        user = find_user(identifier)
        if user is not None and user_phone(user) and sms_ready():
            issued = issue_challenge(user, "reset")
            if issued is not None:
                return Response(issued)
        decoy = secrets.token_urlsafe(24)
        return Response({"challenge": decoy, "phone": "***", "length": OTP_LENGTH, "resend_in": OTP_RESEND_SECONDS})


class ForgotVerifyView(PublicView):
    def post(self, request):
        challenge = str(request.data.get("challenge", ""))
        if throttled(f"forgot-verify-ip:{client_ip(request)}", 30, 600):
            return too_many()
        user, error = check_code(challenge, request.data.get("code", ""), "reset")
        if user is None:
            return Response({"detail": error or "Incorrect code."}, status=status.HTTP_400_BAD_REQUEST)
        token = secrets.token_urlsafe(32)
        cache.set(f"login-reset:{token}", user.pk, RESET_TTL)
        return Response({"reset_token": token})


class ForgotResetView(PublicView):
    def post(self, request):
        token = str(request.data.get("reset_token", ""))
        password = str(request.data.get("password", ""))
        pk = cache.get(f"login-reset:{token}")
        user = get_user_model().objects.filter(pk=pk, is_active=True).first() if pk else None
        if user is None:
            return Response({"detail": "This reset link has expired. Please start again."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password, user)
        except ValidationError as error:
            return Response({"detail": " ".join(error.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save()
        cache.delete(f"login-reset:{token}")
        return Response({"detail": "Password updated."})


class GoogleLoginView(PublicView):
    def post(self, request):
        client_id = settings.GOOGLE_OAUTH_CLIENT_ID
        if not client_id:
            return Response({"detail": "Google sign-in is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if throttled(f"google-ip:{client_ip(request)}", 30, 300):
            return too_many()
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        try:
            claims = id_token.verify_oauth2_token(str(request.data.get("credential", "")), google_requests.Request(), client_id)
        except ValueError:
            return Response({"detail": "Google sign-in failed."}, status=status.HTTP_401_UNAUTHORIZED)
        email = str(claims.get("email", "")).strip()
        if not email or not claims.get("email_verified"):
            return Response({"detail": "Your Google email is not verified."}, status=status.HTTP_401_UNAUTHORIZED)
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            return Response({"detail": "No account exists for this Google email."}, status=status.HTTP_403_FORBIDDEN)
        return Response(tokens_for(user))


def webauthn_origin_ok():
    return list(settings.WEBAUTHN_ORIGINS)


class PasskeyLoginOptionsView(PublicView):
    def post(self, request):
        from webauthn import generate_authentication_options, options_to_json
        from webauthn.helpers.structs import UserVerificationRequirement

        if throttled(f"passkey-ip:{client_ip(request)}", 60, 300):
            return too_many()
        options = generate_authentication_options(
            rp_id=settings.WEBAUTHN_RP_ID,
            user_verification=UserVerificationRequirement.PREFERRED,
        )
        state = secrets.token_urlsafe(24)
        cache.set(f"passkey-login:{state}", b64url_encode(options.challenge), CHALLENGE_TTL)
        import json

        return Response({"state": state, "options": json.loads(options_to_json(options))})


class PasskeyLoginVerifyView(PublicView):
    def post(self, request):
        import json

        from webauthn import verify_authentication_response
        from webauthn.helpers.exceptions import InvalidAuthenticationResponse

        if throttled(f"passkey-verify-ip:{client_ip(request)}", 60, 300):
            return too_many()
        state = str(request.data.get("state", ""))
        challenge = cache.get(f"passkey-login:{state}")
        credential = request.data.get("credential") or {}
        stored = PasskeyCredential.objects.select_related("user").filter(credential_id=str(credential.get("id", ""))).first()
        if not challenge or stored is None or not stored.user.is_active:
            return Response({"detail": "Passkey sign-in failed."}, status=status.HTTP_401_UNAUTHORIZED)
        cache.delete(f"passkey-login:{state}")
        verified = None
        for origin in webauthn_origin_ok():
            try:
                verified = verify_authentication_response(
                    credential=json.dumps(credential),
                    expected_challenge=b64url_decode(challenge),
                    expected_rp_id=settings.WEBAUTHN_RP_ID,
                    expected_origin=origin,
                    credential_public_key=b64url_decode(stored.public_key),
                    credential_current_sign_count=stored.sign_count,
                    require_user_verification=False,
                )
                break
            except InvalidAuthenticationResponse:
                continue
        if verified is None:
            return Response({"detail": "Passkey sign-in failed."}, status=status.HTTP_401_UNAUTHORIZED)
        stored.sign_count = verified.new_sign_count
        stored.last_used_at = timezone.now()
        stored.save(update_fields=["sign_count", "last_used_at"])
        return Response(tokens_for(stored.user))


class PasskeyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            [
                {
                    "id": item.pk,
                    "label": item.label or "Passkey",
                    "created_at": item.created_at,
                    "last_used_at": item.last_used_at,
                }
                for item in PasskeyCredential.objects.filter(user=request.user)
            ]
        )

    def delete(self, request, pk):
        deleted, _ = PasskeyCredential.objects.filter(user=request.user, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)


class PasskeyRegisterOptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import json

        from webauthn import generate_registration_options, options_to_json
        from webauthn.helpers.structs import (
            AuthenticatorSelectionCriteria,
            PublicKeyCredentialDescriptor,
            ResidentKeyRequirement,
            UserVerificationRequirement,
        )

        existing = [
            PublicKeyCredentialDescriptor(id=b64url_decode(item.credential_id))
            for item in PasskeyCredential.objects.filter(user=request.user)
        ]
        options = generate_registration_options(
            rp_id=settings.WEBAUTHN_RP_ID,
            rp_name=settings.WEBAUTHN_RP_NAME,
            user_id=str(request.user.pk).encode(),
            user_name=request.user.email,
            user_display_name=request.user.full_name or request.user.email,
            exclude_credentials=existing,
            authenticator_selection=AuthenticatorSelectionCriteria(
                resident_key=ResidentKeyRequirement.REQUIRED,
                user_verification=UserVerificationRequirement.PREFERRED,
            ),
        )
        cache.set(f"passkey-register:{request.user.pk}", b64url_encode(options.challenge), CHALLENGE_TTL)
        return Response(json.loads(options_to_json(options)))


class PasskeyRegisterVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import json

        from webauthn import verify_registration_response
        from webauthn.helpers.exceptions import InvalidRegistrationResponse

        challenge = cache.get(f"passkey-register:{request.user.pk}")
        credential = request.data.get("credential") or {}
        if not challenge:
            return Response({"detail": "This request has expired. Please try again."}, status=status.HTTP_400_BAD_REQUEST)
        verified = None
        for origin in webauthn_origin_ok():
            try:
                verified = verify_registration_response(
                    credential=json.dumps(credential),
                    expected_challenge=b64url_decode(challenge),
                    expected_rp_id=settings.WEBAUTHN_RP_ID,
                    expected_origin=origin,
                    require_user_verification=False,
                )
                break
            except InvalidRegistrationResponse:
                continue
        if verified is None:
            return Response({"detail": "Passkey registration failed."}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(f"passkey-register:{request.user.pk}")
        transports = ",".join((credential.get("response") or {}).get("transports") or [])
        PasskeyCredential.objects.update_or_create(
            credential_id=b64url_encode(verified.credential_id),
            defaults={
                "user": request.user,
                "public_key": b64url_encode(verified.credential_public_key),
                "sign_count": verified.sign_count,
                "transports": transports,
                "label": str(request.data.get("label") or "Passkey")[:140],
            },
        )
        return Response({"detail": "Passkey added."}, status=status.HTTP_201_CREATED)
