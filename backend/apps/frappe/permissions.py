from __future__ import annotations


def resolve_user(user=None):
    if user is not None and not isinstance(user, str):
        return user
    from apps.frappe.runtime import session

    session_user = user if isinstance(user, str) else getattr(session, "user", None)
    if session_user == "Administrator":
        return "Administrator"
    if not session_user:
        return None
    from apps.core.models import User

    return User.objects.filter(email=session_user).first()


def get_roles(user=None):
    user = resolve_user(user)
    if user == "Administrator":
        return ["System Manager"]
    if not user or not getattr(user, "is_authenticated", False):
        return ["Guest"]
    roles = []
    if getattr(user, "is_staff", False):
        roles.append("Sales Manager")
    from apps.frappe.models import HasRole

    roles.extend(HasRole.objects.filter(parent=user.email).values_list("role", flat=True))
    return sorted(set(roles))


def has_permission(doctype, ptype="read", doc=None, user=None, **kwargs):
    user = resolve_user(user)
    if user == "Administrator":
        return True
    if not user or not getattr(user, "is_authenticated", False):
        return False
    from apps.erpnext.registry import get_meta

    roles = set(get_roles(user))
    for row in get_meta(doctype).get("permissions", []):
        if int(row.get("permlevel") or 0) == 0 and row.get("role") in roles and row.get(ptype):
            if row.get("if_owner") and doc and getattr(doc, "owner", None) != getattr(user, "email", None):
                continue
            return has_user_permission(doctype, doc=doc, user=user)
    if doc and has_docshare_permission(doctype, getattr(doc, "name", None), ptype, user):
        return has_user_permission(doctype, doc=doc, user=user)
    return False


def raise_permission_error(doctype, ptype="read"):
    from apps.frappe import exceptions
    raise exceptions.PermissionError(f"Not permitted to {ptype} {doctype}")


def has_docshare_permission(doctype, name, ptype, user=None):
    user = resolve_user(user)
    if not user or user == "Administrator" or not getattr(user, "is_authenticated", False):
        return False
    try:
        from apps.core.doctype.docshare.docshare import DocShare
    except Exception:
        return False
    field = "read" if ptype in {"read", "select"} else ptype
    if field == "create":
        return False
    if field == "delete":
        return False
    if field == "cancel":
        field = "write"
    if not hasattr(DocShare, field):
        field = "write"
    return DocShare.objects.filter(
        share_doctype=doctype,
        share_name=name,
        user=user,
        **{field: True},
    ).exists() or DocShare.objects.filter(
        share_doctype=doctype,
        share_name=name,
        everyone=True,
        **{field: True},
    ).exists()


def has_user_permission(doctype, doc=None, user=None):
    user = resolve_user(user)
    if not user or user == "Administrator" or not getattr(user, "is_authenticated", False):
        return user == "Administrator"
    from apps.erpnext.registry import get_meta

    restrictions = relevant_user_permissions(doctype, user)
    restrictions = list(restrictions)
    if not restrictions:
        return True
    if doc is None:
        return True
    meta = get_meta(doctype)
    restrictions_by_allow = {}
    for restriction in restrictions:
        restrictions_by_allow.setdefault(restriction.allow, []).append(restriction)
    for allow, allow_restrictions in restrictions_by_allow.items():
        allowed_values = permitted_user_permission_values(allow, allow_restrictions)
        if allow == doctype and getattr(doc, "name", None) not in allowed_values:
            return False
        link_fields = [
            field for field in meta.get("fields", [])
            if field.get("fieldtype") == "Link"
            and field.get("options") == allow
            and not field.get("ignore_user_permissions")
        ]
        for field in link_fields:
            value = getattr(doc, field["fieldname"], None)
            if value not in ("", None) and value not in allowed_values:
                return False
    return True


def apply_user_permissions(doctype, queryset, user=None):
    user = resolve_user(user)
    if not user or user == "Administrator" or not getattr(user, "is_authenticated", False):
        return queryset
    from apps.erpnext.registry import get_meta

    restrictions = list(relevant_user_permissions(doctype, user).filter(allow=doctype))
    if restrictions:
        queryset = queryset.filter(name__in=permitted_user_permission_values(doctype, restrictions))
    restrictions_by_allow = {}
    for restriction in relevant_user_permissions(doctype, user).exclude(allow=doctype):
        restrictions_by_allow.setdefault(restriction.allow, []).append(restriction)
    for allow, allow_restrictions in restrictions_by_allow.items():
        values = permitted_user_permission_values(allow, allow_restrictions)
        for field in get_meta(doctype).get("fields", []):
            if field.get("fieldtype") == "Link" and field.get("options") == allow and not field.get("ignore_user_permissions"):
                queryset = queryset.filter(**{f"{field['fieldname']}__in": values})
                break
    return queryset


def get_permitted_fields(doctype, user=None, ptype="read"):
    roles = set(get_roles(user))
    from apps.erpnext.registry import get_meta

    meta = get_meta(doctype)
    allowed_permlevels = set()
    for row in meta.get("permissions", []):
        if row.get("role") in roles and row.get(ptype):
            allowed_permlevels.add(int(row.get("permlevel") or 0))
    fields = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"]
    for field in meta.get("fields", []):
        if int(field.get("permlevel") or 0) in allowed_permlevels:
            fields.append(field["fieldname"])
    return fields


def relevant_user_permissions(doctype, user):
    from django.db.models import Q

    from apps.frappe.models import UserPermission

    return UserPermission.objects.filter(user=user.email).filter(
        Q(apply_to_all_doctypes=1) | Q(applicable_for__in=["", doctype])
    ).distinct()


def permitted_user_permission_values(allow, restrictions):
    values = {restriction.for_value for restriction in restrictions}
    expandable = [restriction for restriction in restrictions if not restriction.hide_descendants]
    if not expandable:
        return values
    try:
        from apps.erpnext.registry import get_model

        model = get_model(allow)
    except LookupError:
        return values
    if not hasattr(model, "lft") or not hasattr(model, "rgt"):
        return values
    for restriction in expandable:
        node = model.objects.filter(pk=restriction.for_value).first()
        if not node or node.lft is None or node.rgt is None:
            continue
        descendants = model.objects.filter(lft__gt=node.lft, rgt__lt=node.rgt).values_list("name", flat=True)
        values.update(descendants)
    return values


def get_user_permissions(user=None):
    from apps.frappe.models import UserPermission
    from apps.frappe.runtime import session

    if not user:
        user = session.user

    if not user or user in ("Administrator", "Guest"):
        return {}

    result = {}
    rows = UserPermission.objects.filter(user=user).order_by("creation" if hasattr(UserPermission, "creation") else "name")
    for row in rows:
        result.setdefault(row.allow, []).append(
            {
                "doc": row.for_value,
                "applicable_for": row.applicable_for or None,
                "is_default": row.is_default,
                "hide_descendants": row.hide_descendants,
            }
        )
    return result


GUEST_ROLE = "Guest"
ALL_USER_ROLE = "All"
SYSTEM_USER_ROLE = "Desk User"
ADMIN_ROLE = "Administrator"
AUTOMATIC_ROLES = (GUEST_ROLE, ALL_USER_ROLE, SYSTEM_USER_ROLE, ADMIN_ROLE)

rights = (
    "select",
    "read",
    "write",
    "create",
    "delete",
    "submit",
    "cancel",
    "amend",
    "print",
    "email",
    "report",
    "import",
    "export",
    "share",
)


def add_permission(doctype, role, permlevel=0, ptype=None):
    import frappe

    from apps.frappe.models import DocPerm

    row, _created = DocPerm.objects.get_or_create(
        parent=doctype,
        role=role,
        permlevel=permlevel,
        defaults={
            "name": frappe.generate_hash(length=10),
            "parentfield": "permissions",
            "parenttype": "DocType",
        },
    )
    if ptype:
        update_permission_property(doctype, role, permlevel, ptype, 1)
    return row


def update_permission_property(doctype, role, permlevel, ptype, value):
    from apps.frappe.models import DocPerm

    fieldname = "import_data" if ptype == "import" else ptype
    if fieldname not in {field.name for field in DocPerm._meta.fields}:
        return
    row = add_permission(doctype, role, permlevel)
    setattr(row, fieldname, value)
    row.save(update_fields=[fieldname])


def get_rights(doctype=None):
    return rights


def allow_everything(doctype):
    perm = {ptype: 1 for ptype in get_rights(doctype)}
    perm["has_if_owner_enabled"] = False
    perm["if_owner"] = {}
    return perm


def get_role_permissions(doctype_meta, user=None, is_owner=None, debug=False):
    from apps.erpnext.registry import get_meta
    from apps.frappe.runtime import _dict, session
    from apps.frappe.utils.data import cint

    if isinstance(doctype_meta, str):
        doctype_meta = get_meta(doctype_meta)
    name = doctype_meta.get("name")
    user = user or session.user

    if user == "Administrator":
        return _dict(allow_everything(name))

    perms = _dict(if_owner={})
    roles = get_roles(user)

    applicable_permissions = [
        perm
        for perm in doctype_meta.get("permissions", [])
        if perm.get("role") in roles and cint(perm.get("permlevel")) == 0
    ]

    def has_permission_without_if_owner_enabled(ptype):
        return any(p.get(ptype, 0) and not p.get("if_owner", 0) for p in applicable_permissions)

    has_if_owner_enabled = any(p.get("if_owner", 0) for p in applicable_permissions)
    perms["has_if_owner_enabled"] = has_if_owner_enabled

    for ptype in get_rights(name):
        pvalue = any(p.get(ptype, 0) for p in applicable_permissions)
        perms[ptype] = cint(pvalue)
        if pvalue and has_if_owner_enabled and not has_permission_without_if_owner_enabled(ptype) and ptype != "create":
            perms["if_owner"][ptype] = cint(pvalue and is_owner)
            perms[ptype] = 1 if ptype in ("select", "read") else 0

    return perms


def get_doctypes_with_read(user=None):
    from apps.erpnext.registry import _meta_by_doctype

    roles = set(get_roles(user))
    result = []
    for name, meta in _meta_by_doctype().items():
        for perm in meta.get("permissions", []):
            if perm.get("role") in roles and perm.get("read"):
                result.append(name)
                break
    return result


def get_allowed_docs_for_doctype(user_permissions, doctype):
    return filter_allowed_docs_for_doctype(user_permissions, doctype, with_default_doc=False)


def filter_allowed_docs_for_doctype(user_permissions, doctype, with_default_doc=True):
    allowed_doc = []
    default_doc = None
    for doc in user_permissions:
        if not doc.get("applicable_for") or doc.get("applicable_for") == doctype:
            allowed_doc.append(doc.get("doc"))
            if doc.get("is_default") or (len(user_permissions) == 1 and with_default_doc):
                default_doc = doc.get("doc")

    return (allowed_doc, default_doc) if with_default_doc else allowed_doc


def add_user_permission(
    doctype,
    name,
    user,
    ignore_permissions=False,
    applicable_for=None,
    is_default=0,
    hide_descendants=0,
):
    """Add user permission"""
    from frappe.core.doctype.user_permission.user_permission import user_permission_exists

    if not user_permission_exists(user, doctype, name, applicable_for):
        if not frappe.db.exists(doctype, name):
            frappe.throw(_("{0} {1} not found").format(_(doctype), name), frappe.DoesNotExistError)

        frappe.get_doc(
            doctype="User Permission",
            user=user,
            allow=doctype,
            for_value=name,
            is_default=is_default,
            applicable_for=applicable_for,
            apply_to_all_doctypes=0 if applicable_for else 1,
            hide_descendants=hide_descendants,
        ).insert(ignore_permissions=ignore_permissions)


def has_controller_permissions(doc, ptype, user=None, debug=False) -> bool:
    import frappe

    if not user:
        user = frappe.session.user

    hooks = frappe.get_hooks("has_permission")
    methods = hooks.get(doc.doctype, []) + hooks.get("*", [])

    for method in reversed(methods):
        controller_permission = frappe.call(method, doc=doc, ptype=ptype, user=user, debug=debug)
        if not controller_permission:
            return bool(controller_permission)

    return True


def get_valid_perms(doctype=None, user=None, roles=None):
    from apps.erpnext.registry import _meta_by_doctype, get_meta
    from apps.frappe.runtime import _dict

    roles = set(roles or get_roles(user))
    names = [doctype] if doctype else list(_meta_by_doctype())
    perms = []
    for name in names:
        for perm in get_meta(name).get("permissions", []):
            if perm.get("role") in roles:
                row = _dict(perm)
                row["parent"] = name
                perms.append(row)
    return perms


def get_doc_permissions(doc, user=None, ptype=None, debug=False):
    from apps.frappe.runtime import session

    user = user or session.user
    allowed = {right: int(bool(has_permission(doc.doctype, right, doc=doc, user=user))) for right in get_rights(doc.doctype)}
    return allowed


def remove_user_permission(doctype, name, user, ignore_permissions=False):
    user_permission_name = frappe.db.get_value(
        "User Permission", dict(user=user, allow=doctype, for_value=name)
    )
    frappe.delete_doc(
        "User Permission", user_permission_name, force=True, ignore_permissions=ignore_permissions
    )


def print_has_permission_check_logs(func):
    @functools.wraps(func)
    def inner(*args, **kwargs):
        print_logs = kwargs.get("print_logs", True)
        self_perm_check = True if not kwargs.get("user") else kwargs.get("user") == frappe.session.user

        if print_logs:
            frappe.flags["has_permission_check_logs"] = []

        result = func(*args, **kwargs)

        if not result and self_perm_check and print_logs:
            if logs := frappe.flags.get("has_permission_check_logs"):
                msgprint(("<br>").join(logs))

        if print_logs:
            frappe.flags.pop("has_permission_check_logs", None)
        return result

    return inner


def _debug_log(log: str):
    if not hasattr(frappe.local, "permission_debug_log"):
        frappe.local.permission_debug_log = []
    frappe.local.permission_debug_log.append(log)


def _pop_debug_log() -> list[str]:
    if log := getattr(frappe.local, "permission_debug_log", None):
        del frappe.local.permission_debug_log
        return log
    return []


def get_all_perms(role):
    """Return valid permissions for a given role."""
    perms = frappe.get_all("DocPerm", fields="*", filters=dict(role=role))
    custom_perms = frappe.get_all("Custom DocPerm", fields="*", filters=dict(role=role))
    doctypes_with_custom_perms = frappe.get_all("Custom DocPerm", pluck="parent", distinct=True)

    for p in perms:
        if p.parent not in doctypes_with_custom_perms:
            custom_perms.append(p)
    return custom_perms


def get_doctype_roles(doctype, access_type="read"):
    """Return a list of roles that are allowed to access the given `doctype`."""
    meta = frappe.get_meta(doctype)
    return [d.role for d in meta.get("permissions") if d.get(access_type)]


def get_perms_for(roles, perm_doctype="DocPerm", filters=None):
    """Get perms for given roles"""
    query_filters = {"permlevel": 0, "docstatus": 0, "role": ["in", roles]}

    if filters:
        query_filters.update(filters)

    return frappe.get_all(perm_doctype, fields=["*"], filters=query_filters)


def get_doctypes_with_custom_docperms():
    """Return all the doctypes with Custom Docperms."""

    doctypes = frappe.get_all("Custom DocPerm", fields=["parent"], distinct=1)
    return [d.parent for d in doctypes]


def clear_user_permissions_for_doctype(doctype, user=None):
    filters = {"allow": doctype}
    if user:
        filters["user"] = user
    user_permissions_for_doctype = frappe.get_all("User Permission", filters=filters)
    for d in user_permissions_for_doctype:
        frappe.delete_doc("User Permission", d.name, force=True)


def can_import(doctype, raise_exception=False):
    if not ("System Manager" in frappe.get_roles() or has_permission(doctype, "import")):
        if raise_exception:
            raise frappe.PermissionError(f"You are not allowed to import: {doctype}")
        else:
            return False
    return True


def can_export(doctype, raise_exception=False, is_owner=False):
    if "System Manager" in frappe.get_roles():
        return True
    else:
        role_permissions = frappe.permissions.get_role_permissions(doctype, is_owner=is_owner)
        has_access = role_permissions.get("export") or role_permissions.get("if_owner").get("export")
        if not has_access and raise_exception:
            raise frappe.PermissionError(_("You are not allowed to export {} doctype").format(doctype))
        return has_access


def get_doc_name(doc):
    if not doc:
        return None
    return doc if isinstance(doc, str) else str(doc.name)


def push_perm_check_log(log, debug=False):
    debug and _debug_log(log)
    if frappe.flags.get("has_permission_check_logs") is None:
        return

    frappe.flags.get("has_permission_check_logs").append(log)


def is_system_user(user: str | None = None) -> bool:
    return frappe.get_cached_value("User", user or frappe.session.user, "user_type") == "System User"


def check_doctype_permission(doctype: str, ptype: str = "read") -> None:
    """
    Designed specfically to override DoesNotExistError in some scenarios.
    Ignores share permissions.
    """

    _message_log = frappe.local.message_log
    frappe.local.message_log = []
    try:
        frappe.has_permission(doctype, ptype, throw=True, ignore_share_permissions=True)
    except frappe.PermissionError:
        frappe.flags.disable_traceback = True
        raise

    frappe.local.message_log = _message_log
