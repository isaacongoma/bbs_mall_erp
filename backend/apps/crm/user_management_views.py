# Port of crm/api/user.py and crm/api/__init__.py's invite_by_email (frappe/crm, AGPL-3.0)
# onto Django's auth flags: is_superuser -> System Manager, is_staff -> Sales Manager,
# any other active user -> Sales User (see session_api.py for the mapping).
import json
import re

from rest_framework import serializers, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import User
from apps.crm.doctype.invitation.invitation import CRMInvitation

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ROLES = ("System Manager", "Sales Manager", "Sales User")


class CRMInvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMInvitation
        fields = ("name", "email", "role", "status", "creation", "modified")
        read_only_fields = fields


class CRMInvitationViewSet(viewsets.ModelViewSet):
    queryset = CRMInvitation.objects.all()
    serializer_class = CRMInvitationSerializer
    lookup_field = "name"
    filterset_fields = ("status", "role", "email")


def _is_admin(user) -> bool:
    return bool(user.is_superuser)


def _is_manager(user) -> bool:
    return bool(user.is_superuser or user.is_staff)


def _deny(message: str) -> Response:
    return Response({"detail": message}, status=403)


def _apply_role(user: User, role: str) -> None:
    user.is_superuser = role == "System Manager"
    user.is_staff = role in ("System Manager", "Sales Manager")
    user.save(update_fields=["is_superuser", "is_staff"])


def _find_user(identifier: str) -> User | None:
    if str(identifier).isdigit():
        found = User.objects.filter(pk=int(identifier)).first()
        if found:
            return found
    return User.objects.filter(email=identifier).first()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_user_role(request):
    new_role = request.data.get("new_role")
    if new_role not in ROLES:
        return Response({"detail": "Invalid role"}, status=400)
    if new_role != "Sales User" and not _is_admin(request.user):
        return _deny("Only an Admin can grant Admin or Manager access")
    if not _is_manager(request.user):
        return _deny("Only managers can change roles")

    target = _find_user(request.data.get("user", ""))
    if target is None:
        return Response({"detail": "User not found"}, status=404)
    if target.is_superuser and not _is_admin(request.user):
        return _deny("Cannot change role of user with Admin access")
    _apply_role(target, new_role)
    return Response({"user": str(target.pk), "role": new_role})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_crm_roles_from_user(request):
    if not _is_manager(request.user):
        return _deny("Only managers can remove users")
    target = _find_user(request.data.get("user", ""))
    if target is None:
        return Response({"detail": "User not found"}, status=404)
    if target.is_superuser and not _is_admin(request.user):
        return _deny("Cannot remove a user with Admin access")
    if target.pk == request.user.pk:
        return Response({"detail": "You cannot remove yourself"}, status=400)
    target.is_active = False
    target.save(update_fields=["is_active"])
    return Response({"user": str(target.pk)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_existing_users(request):
    if not _is_manager(request.user):
        return _deny("Only managers can add users")
    role = request.data.get("role", "Sales User")
    if role not in ROLES or (role != "Sales User" and not _is_admin(request.user)):
        return _deny("You cannot grant this role")
    raw = request.data.get("users", "[]")
    emails = json.loads(raw) if isinstance(raw, str) else list(raw)

    missing = []
    for email in emails:
        user = User.objects.filter(email=email).first()
        if user is None:
            missing.append(email)
            continue
        user.is_active = True
        user.save(update_fields=["is_active"])
        _apply_role(user, role)
    if missing:
        return Response({"detail": "No user found for: " + ", ".join(missing)}, status=400)
    return Response({"added": len(emails)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invite_by_email(request):
    if not _is_manager(request.user):
        return _deny("Only managers can invite users")
    role = request.data.get("role", "Sales User")
    if role not in ROLES or (role != "Sales User" and not _is_admin(request.user)):
        return _deny("You cannot grant this role")

    emails = [email.strip() for email in str(request.data.get("emails", "")).split(",") if email.strip()]
    if not emails:
        return Response({"detail": "Please enter at least one email address"}, status=400)
    invalid = [email for email in emails if not EMAIL_PATTERN.match(email)]
    if invalid:
        return Response({"detail": "Invalid email address: " + ", ".join(invalid)}, status=400)

    existing_users = set(User.objects.filter(email__in=emails).values_list("email", flat=True))
    if existing_users:
        return Response({"detail": "User with email %s already exists" % ", ".join(sorted(existing_users))}, status=400)
    pending = set(CRMInvitation.objects.filter(email__in=emails, status="Pending").values_list("email", flat=True))
    if pending:
        return Response({"detail": "User with email %s already invited" % ", ".join(sorted(pending))}, status=400)

    for email in emails:
        CRMInvitation.objects.create(email=email, role=role, invited_by=request.user)
    return Response({"invited": emails})
