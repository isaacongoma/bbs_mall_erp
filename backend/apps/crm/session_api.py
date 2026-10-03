# Ported from crm/api/session.py (frappe/crm, AGPL-3.0).
#
# Frappe's role system (User <-> Has Role <-> Role, arbitrary custom roles)
# has no Django equivalent here -- Django's built-in auth only gives us
# is_superuser/is_staff/is_active on the User model. We collapse Frappe's
# CRM_ALLOWED_ROLES ("System Manager", "Sales Manager", "Sales User") onto
# that: is_superuser -> System Manager, is_staff (non-superuser) -> Sales
# Manager, any other active authenticated user -> Sales User. Every
# authenticated user is therefore CRM-permitted, unlike the original which
# can 403 a logged-in user with no CRM role -- there is no such user class
# here since we do not model non-CRM roles at all.
from __future__ import annotations

from apps.core.models import User

USER_FIELDS = ["name", "email", "enabled", "user_image", "first_name", "last_name", "full_name", "user_type", "language"]


def get_session_role_flags(user) -> dict:
    return {
        "is_system_manager": bool(user.is_superuser),
        "is_sales_manager": bool(user.is_staff and not user.is_superuser),
        "is_sales_user": bool(user.is_active and not user.is_staff and not user.is_superuser),
    }


def _serialize_user(user, session_user_pk=None) -> dict:
    flags = get_session_role_flags(user)
    role = "System Manager" if flags["is_system_manager"] else "Sales Manager" if flags["is_sales_manager"] else "Sales User"
    full_name = user.get_full_name() or user.email
    is_telephony_agent = hasattr(user, "telephony_agent")
    data = {
        "name": str(user.pk),
        "email": user.email,
        "enabled": user.is_active,
        "user_image": None,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": full_name,
        "user_type": "System User",
        "language": "en",
        "roles": [role, "All", "Guest"],
        "role": role,
        "is_telephony_agent": is_telephony_agent,
    }
    if session_user_pk is not None and user.pk == session_user_pk:
        data["session_user"] = True
    return data


def get_users(include_all: bool, requesting_user) -> tuple[list, list]:
    if isinstance(include_all, str):
        include_all = include_all.lower() in ("1", "true", "yes")
    flags = get_session_role_flags(requesting_user)
    if not flags["is_system_manager"]:
        include_all = False

    qs = User.objects.filter(is_active=True).order_by("first_name", "last_name")
    users = [_serialize_user(u, requesting_user.pk) for u in qs]
    crm_users = users  # every active user is CRM-permitted here (see module docstring)

    if include_all:
        return users, crm_users
    return crm_users, crm_users


def get_user_info(users) -> list:
    if isinstance(users, str):
        import json

        users = json.loads(users)
    if not users:
        return []
    names = [str(u) for u in users][:200]
    qs = User.objects.filter(pk__in=[n for n in names if n.isdigit()])
    by_email = User.objects.filter(email__in=names)
    seen = {}
    for u in list(qs) + list(by_email):
        seen[u.pk] = u
    return [
        {
            "name": str(u.pk),
            "email": u.email,
            "full_name": u.get_full_name() or u.email,
            "user_image": None,
            "user_type": "System User",
        }
        for u in seen.values()
    ]


def get_organizations() -> list:
    from apps.crm.doctype.organization.organization import CRMOrganization

    # Named fields (not bare .values()) so FK/Link columns key as the plain
    # fieldname ("industry") rather than Django's default "<field>_id" --
    # matches Frappe's Link-field convention (see doc_api._apply_filters).
    fieldnames = [f.name for f in CRMOrganization._meta.get_fields() if hasattr(f, "attname") and not f.many_to_many]
    return list(CRMOrganization.objects.order_by("name").values(*fieldnames))
