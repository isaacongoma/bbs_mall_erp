from frappe.query_builder import DocType
import copy
from frappe.app_state import is_module_disabled
from frappe.core.doctype.permission_type.permission_type import get_doctype_ptype_map
from frappe.utils import cint, cstr
import functools
from frappe import _, msgprint


class _LazyFrappe:
    def __getattr__(self, name):
        import frappe as _frappe

        return getattr(_frappe, name)


frappe = _LazyFrappe()


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


def setup_custom_perms(parent):
    """if custom permssions are not setup for the current doctype, set them up"""
    if not frappe.db.exists("Custom DocPerm", dict(parent=parent)):
        copy_perms(parent)
        return True


def copy_perms(parent):
    """Copy all DocPerm in to Custom DocPerm for the given document"""
    for d in frappe.get_all("DocPerm", fields="*", filters=dict(parent=parent)):
        custom_perm = frappe.new_doc("Custom DocPerm")
        custom_perm.update(d)
        custom_perm.insert(ignore_permissions=True)


def reset_perms(doctype):
    """Reset permissions for given doctype."""
    from frappe.desk.notifications import delete_notification_count_for

    delete_notification_count_for(doctype)
    for custom_docperm in frappe.get_all("Custom DocPerm", filters={"parent": doctype}, pluck="name"):
        frappe.delete_doc("Custom DocPerm", custom_docperm, ignore_permissions=True, force=True)


def get_linked_doctypes(dt: str) -> list:
    meta = frappe.get_meta(dt)
    linked_doctypes = [dt] + [
        d.options
        for d in meta.get(
            "fields",
            {"fieldtype": "Link", "ignore_user_permissions": ("!=", 1), "options": ("!=", "[Select]")},
        )
    ]

    return list(set(linked_doctypes))


def has_child_permission(
    child_doctype,
    ptype="read",
    child_doc=None,
    user=None,
    parent_doctype=None,
    *,
    debug=False,
    print_logs=True,
) -> bool:
    debug and _debug_log("This doctype is a child table, permissions will be checked on parent.")
    if isinstance(child_doc, str):
        child_doc = frappe.db.get_value(
            child_doctype,
            child_doc,
            ("parent", "parenttype", "parentfield"),
            as_dict=True,
        )

    if child_doc:
        parent_doctype = child_doc.parenttype

    if not parent_doctype:
        push_perm_check_log(
            _("Please specify a valid parent DocType for {0}").format(frappe.bold(child_doctype)),
            debug=debug,
        )
        return False

    parent_meta = frappe.get_meta(parent_doctype)

    if parent_meta.istable or not (
        valid_parentfields := [
            df.fieldname
            for df in parent_meta.get_table_fields(include_computed=True)
            if df.options == child_doctype
        ]
    ):
        push_perm_check_log(
            _("{0} is not a valid parent DocType for {1}").format(
                frappe.bold(parent_doctype), frappe.bold(child_doctype)
            ),
            debug=debug,
        )
        return False

    if child_doc:
        parentfield = child_doc.parentfield
        if not parentfield:
            push_perm_check_log(
                _("Parentfield not specified in {0}: {1}").format(
                    frappe.bold(child_doctype), frappe.bold(child_doc.name)
                ),
                debug=debug,
            )
            return False

        if parentfield not in valid_parentfields:
            push_perm_check_log(
                _("{0} is not a valid parentfield for {1}").format(
                    frappe.bold(parentfield), frappe.bold(child_doctype)
                ),
                debug=debug,
            )
            return False

        permlevel = parent_meta.get_field(parentfield).permlevel
        accessible_permlevels = parent_meta.get_permlevel_access(
            "read" if ptype == "select" else ptype, user=user
        )
        if permlevel > 0 and permlevel not in accessible_permlevels:
            push_perm_check_log(
                _("Insufficient Permission Level for {0}").format(frappe.bold(parent_doctype)), debug=debug
            )
            debug and _debug_log(
                f"This table is perm level {permlevel} but user only has access to {accessible_permlevels}"
            )
            return False

        parent_doc = child_doc.parent_doc if hasattr(child_doc, "parent_doc") else None
        if parent_doc is None:
            parent_doc = child_doc.parent
    else:
        parent_doc = None

    return has_permission(
        parent_doctype,
        ptype=ptype,
        doc=parent_doc,
        user=user,
        print_logs=print_logs,
        debug=debug,
    )


def handle_does_not_exist_error(fn):
    """
    Decorator to override DoesNotExistError when handling exceptions.
    Requires the first argument to be an Exception.
    """

    @functools.wraps(fn)
    def wrapper(e, *args, **kwargs):
        if isinstance(e, frappe.DoesNotExistError) and (doctype := getattr(e, "doctype", None)):
            try:
                check_doctype_permission(doctype)
            except frappe.PermissionError as _e:
                return fn(_e, *args, **kwargs)

        return fn(e, *args, **kwargs)

    return wrapper


def _get_parent_and_ancestors(doctype, parent):
    yield parent

    from frappe.utils.nestedset import get_ancestors_of

    yield from get_ancestors_of(doctype, parent)


def check_app_permission():
    is_system_manager = "System Manager" in frappe.get_roles(frappe.session.user)
    if is_system_user() and is_system_manager:
        return True
    return False


def has_user_permission(doc, user=None, debug=False, *, ptype=None, strict=True):
    """Return True if User is allowed to view considering User Permissions."""
    from frappe.core.doctype.user_permission.user_permission import get_user_permissions

    user_permissions = get_user_permissions(user)

    if not user_permissions:
        debug and _debug_log("User is not affected by any user permissions")
        return True

    doctype = doc.get("doctype")
    docname = doc.get("name")

    apply_strict_user_permissions = strict and (
        False if doc.meta.issingle else frappe.get_system_settings("apply_strict_user_permissions")
    )
    if apply_strict_user_permissions:
        debug and _debug_log("Strict user permissions will be applied")

    if (
        apply_strict_user_permissions
        and doc.get("__islocal")
        and ptype in ("read", "write")
        and (not docname or (docname and not frappe.db.exists(doctype, docname, cache=True)))
    ):
        apply_strict_user_permissions = False
        debug and _debug_log("Strict permissions will be skipped on local document")

    if doctype in user_permissions:
        doctype_up = user_permissions.get(doctype, [])
        allowed_docs = get_allowed_docs_for_doctype(doctype_up, doctype)


        if allowed_docs:
            not_permitted = True
            if doc.meta.is_tree and ptype == "create":
                if parent := doc.get(doc.nsm_parent_field):
                    doc_hide_descendants = {d.doc: d.hide_descendants for d in doctype_up}
                    for d in _get_parent_and_ancestors(doctype, parent):
                        if d in allowed_docs and not doc_hide_descendants[d]:
                            not_permitted = False
                            break
            else:
                not_permitted = not docname or str(docname) not in allowed_docs

            if not_permitted:
                debug and _debug_log(
                    "User doesn't have access to this document because of User Permissions, allowed documents: "
                    + str(allowed_docs)
                )
                push_perm_check_log(_("Not allowed for {0}: {1}").format(_(doctype), docname), debug=debug)
                return False

        debug and _debug_log(f"User Has access to {docname} via User Permissions.")


    def check_user_permission_on_link_fields(d):

        meta = frappe.get_meta(d.doctype)

        for field in meta.get_link_fields():
            if field.ignore_user_permissions:
                continue

            if not d.get(field.fieldname) and not apply_strict_user_permissions:
                continue

            if field.options not in user_permissions:
                continue

            allowed_docs = get_allowed_docs_for_doctype(user_permissions.get(field.options, []), doctype)

            if allowed_docs and str(d.get(field.fieldname)) not in allowed_docs:
                if d.get("parentfield"):
                    msg = _(
                        "You are not allowed to access this {0} record because it is linked to {1} '{2}' in row {3}, field {4}"
                    ).format(
                        _(meta.name),
                        _(field.options),
                        d.get(field.fieldname) or _("empty"),
                        d.idx,
                        _(field.label, context=field.parent) if field.label else field.fieldname,
                    )
                else:
                    msg = _(
                        "You are not allowed to access this {0} record because it is linked to {1} '{2}' in field {3}"
                    ).format(
                        _(meta.name),
                        _(field.options),
                        d.get(field.fieldname) or _("empty"),
                        _(field.label, context=field.parent) if field.label else field.fieldname,
                    )

                push_perm_check_log(msg, debug=debug)

                return False

        return True

    if not check_user_permission_on_link_fields(doc):
        return False

    for d in doc.get_all_children(include_computed=True):
        if not check_user_permission_on_link_fields(d):
            return False

    return True


def has_controller_permissions(doc, ptype, user=None, debug=False) -> bool:
    """Return controller permissions if denied, True if not defined.

    Controllers can only deny permission, they can not explicitly grant any permission that wasn't
    already present."""
    if not user:
        user = frappe.session.user

    hooks = frappe.get_hooks("has_permission")
    methods = hooks.get(doc.doctype, []) + hooks.get("*", [])

    for method in reversed(methods):
        controller_permission = frappe.call(method, doc=doc, ptype=ptype, user=user, debug=debug)
        debug and _debug_log(f"Controller permission check from {method}: {controller_permission}")
        if not controller_permission:
            return bool(controller_permission)

    return True


def get_doctypes_with_read(user: str | None = None):
    return list({cstr(p.parent) for p in get_valid_perms(user=user) if p.parent and p.read})


def get_valid_perms(doctype=None, user=None, roles=None):
    """Get valid permissions for the current user from DocPerm and Custom DocPerm"""
    roles = roles or get_roles(user)

    filters = {}
    if doctype:
        filters["parent"] = doctype

    perms = get_perms_for(roles, filters=filters)
    custom_perms = get_perms_for(roles, "Custom DocPerm", filters=filters)

    doctypes_with_custom_perms = get_doctypes_with_custom_docperms()
    if doctype and doctype not in doctypes_with_custom_perms:
        custom_perms.extend(perms)

    elif not doctype:
        for p in perms:
            if p["parent"] not in doctypes_with_custom_perms:
                custom_perms.append(p)

    return custom_perms


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


def remove_user_permission(doctype, name, user, ignore_permissions=False):
    user_permission_name = frappe.db.get_value(
        "User Permission", dict(user=user, allow=doctype, for_value=name)
    )
    frappe.delete_doc(
        "User Permission", user_permission_name, force=True, ignore_permissions=ignore_permissions
    )


def add_permission(doctype, role, permlevel=0, ptype=None):
    """Add a new permission rule to the given doctype
    for the given Role and Permission Level"""
    from frappe.core.doctype.doctype.doctype import validate_permissions_for_doctype

    setup_custom_perms(doctype)

    if frappe.db.get_value(
        "Custom DocPerm", dict(parent=doctype, role=role, permlevel=permlevel, if_owner=0)
    ):
        frappe.msgprint(
            _("Rule for this doctype, role, permlevel and if-owner combination already exists.").format(
                doctype,
            ),
            alert=True,
        )
        return

    if not ptype:
        ptype = "read"

    custom_docperm = frappe.get_doc(
        {
            "doctype": "Custom DocPerm",
            "__islocal": 1,
            "parent": doctype,
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": role,
            "permlevel": permlevel,
            ptype: 1,
        }
    )

    custom_docperm.save()

    validate_permissions_for_doctype(doctype)
    return custom_docperm.name


def get_rights(doctype=None):
    if not doctype:
        return std_rights
    custom_rights = get_doctype_ptype_map().get(doctype, [])
    return list(std_rights) + custom_rights


def allow_everything(doctype=None):
    """Return a dict with access to everything, eg. {"read": 1, "write": 1, ...}."""
    return {ptype: 1 for ptype in get_rights(doctype)}


def get_allowed_docs_for_doctype(user_permissions, doctype):
    """Return all the docs from the passed `user_permissions` that are allowed under provided doctype."""
    return filter_allowed_docs_for_doctype(user_permissions, doctype, with_default_doc=False)


def filter_allowed_docs_for_doctype(user_permissions, doctype, with_default_doc=True):
    """Return all the docs from the passed `user_permissions` that are
    allowed under provided doctype along with default doc value if `with_default_doc` is set."""
    allowed_doc = []
    default_doc = None
    for doc in user_permissions:
        if not doc.get("applicable_for") or doc.get("applicable_for") == doctype:
            allowed_doc.append(doc.get("doc"))
            if doc.get("is_default") or (len(user_permissions) == 1 and with_default_doc):
                default_doc = doc.get("doc")

    return (allowed_doc, default_doc) if with_default_doc else allowed_doc


std_rights = (
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


@print_has_permission_check_logs
def has_permission(
    doctype,
    ptype="read",
    doc=None,
    user=None,
    *,
    parent_doctype=None,
    print_logs=True,
    debug=False,
    ignore_share_permissions=False,
) -> bool:
    """Return True if user has permission `ptype` for given `doctype`.
    If `doc` is passed, also check user, share and owner permissions.

    :param doctype: DocType to check permission for
    :param ptype: Permission Type to check
    :param doc: Check User Permissions for specified document.
    :param user: User to check permission for. Defaults to current user.
    :param print_logs: If True, will display a message using frappe.msgprint
                    which explains why the permission check failed.
    :param parent_doctype:
            Required when checking permission for a child DocType (unless doc is specified)
    """

    if not user:
        user = frappe.session.user

    if user == "Administrator":
        debug and _debug_log("Allowed everything because user is Administrator")
        return True

    if ptype == "share" and frappe.get_system_settings("disable_document_sharing"):
        debug and _debug_log("User can't share because sharing is disabled globally from system settings")
        return False

    if not doc and hasattr(doctype, "doctype"):
        doc = doctype
        doctype = doc.doctype

    if frappe.is_table(doctype):
        return has_child_permission(
            doctype,
            ptype,
            doc,
            user,
            parent_doctype,
            debug=debug,
            print_logs=print_logs,
        )

    meta = frappe.get_meta(doctype)

    if is_module_disabled(meta.module):
        debug and _debug_log(f"Not allowed because {meta.module} belongs to a disabled app")
        return False

    if not doc and meta.issingle:
        doc = meta.name

    if doc:
        if isinstance(doc, str | int):
            doc = frappe.get_lazy_doc(meta.name, doc)
        perm = get_doc_permissions(doc, user=user, ptype=ptype, debug=debug).get(ptype)
        if not perm:
            debug and _debug_log(
                "Permission check failed from role permission system. Check if user's role grant them permission to the document."
            )
            if not frappe.flags.get("has_permission_check_logs"):
                msg = _("User {0} does not have access to this document").format(frappe.bold(user))
                if meta.issingle:
                    msg += f": {_(doc.doctype)}"
                elif has_permission(doc.doctype, print_logs=False):
                    msg += f": {_(doc.doctype)} - {doc.name}"
                push_perm_check_log(msg, debug=debug)
    else:
        if ptype == "submit" and not cint(meta.is_submittable):
            push_perm_check_log(_("Document Type is not submittable"), debug=debug)
            return False

        if ptype == "import" and not cint(meta.allow_import):
            push_perm_check_log(_("Document Type is not importable"), debug=debug)
            return False

        role_permissions = get_role_permissions(meta, user=user, debug=debug)
        debug and _debug_log(
            "User has following permissions using role permission system: "
            + frappe.as_json(role_permissions, indent=8)
        )

        perm = role_permissions.get(ptype)

        if not perm:
            push_perm_check_log(
                _("User {0} does not have doctype access via role permission for document {1}").format(
                    frappe.bold(user), frappe.bold(_(doctype))
                ),
                debug=debug,
            )

    def false_if_not_shared():
        share_rights = ["read", "write", "share", "submit", "email", "print"]
        custom_rights = get_doctype_ptype_map().get(doctype, [])

        if ptype not in share_rights + custom_rights:
            debug and _debug_log(f"Permission type {ptype} can not be shared")
            return False

        rights = ["read" if ptype in ("email", "print") else ptype]

        if doc:
            doc_name = get_doc_name(doc)
            shared = frappe.share.get_shared(
                doctype,
                user,
                rights=rights,
                filters=[["share_name", "=", doc_name]],
                limit=1,
            )
            debug and _debug_log(f"Document is shared with user for {ptype}? {bool(shared)}")
            return bool(shared)

        elif frappe.share.get_shared(doctype, user, rights=rights, limit=1):
            debug and _debug_log(f"At least one document is shared with user with perm: {rights}")
            return True

        return False

    if not perm and not ignore_share_permissions:
        debug and _debug_log("Checking if document/doctype is explicitly shared with user")
        perm = false_if_not_shared()

    if not perm and ptype == "select":
        perm = has_permission(
            doctype,
            ptype="read",
            doc=doc,
            user=user,
            parent_doctype=parent_doctype,
            print_logs=print_logs,
            debug=debug,
            ignore_share_permissions=ignore_share_permissions,
        )

    return bool(perm)


def get_doc_permissions(doc, user=None, ptype=None, debug=False):
    """Return a dict of evaluated permissions for given `doc` like `{"read":1, "write":1}`"""
    if not user:
        user = frappe.session.user

    meta = frappe.get_meta(doc.doctype)

    def is_user_owner():
        return (doc.get("owner") or "").lower() == user.lower()

    if not has_controller_permissions(doc, ptype, user=user, debug=debug):
        push_perm_check_log(_("Not allowed via controller permission check"), debug=debug)
        return {ptype: 0}

    permissions = copy.deepcopy(get_role_permissions(meta, user=user, is_owner=is_user_owner(), debug=debug))

    debug and _debug_log(
        "User has following permissions using role permission system: "
        + frappe.as_json(permissions, indent=8)
    )

    if not cint(meta.is_submittable):
        permissions["submit"] = 0

    if not cint(meta.allow_import):
        permissions["import"] = 0

    if permissions.get("has_if_owner_enabled"):
        permissions.update(permissions.get("if_owner", {}))
        debug and _debug_log(
            "User is owner of document, so permissions are updated to: " + frappe.as_json(permissions)
        )

    if not has_user_permission(doc, user, debug=debug, ptype=ptype):
        if is_user_owner():
            permissions = permissions.get("if_owner", {})
            permissions["create"] = 0
            debug and _debug_log("User has only 'If owner' permissions because of User Permissions")
        else:
            debug and _debug_log("User has no permissions because of User Permissions")
            permissions = {}

    debug and _debug_log(
        "Final applicable permissions after evaluating user permissions: "
        + frappe.as_json(permissions, indent=8)
    )
    return permissions


def get_role_permissions(doctype_meta, user=None, is_owner=None, debug=False):
    """
    Return dict of evaluated role permissions like:
            {
                    "read": 1,
                    "write": 0,
                    // if "if_owner" is enabled
                    "if_owner":
                            {
                                    "read": 1,
                                    "write": 0
                            }
            }
    """
    if isinstance(doctype_meta, str):
        doctype_meta = frappe.get_meta(doctype_meta)

    if not user:
        user = frappe.session.user

    cache_key = (doctype_meta.name, user, bool(is_owner))

    if user == "Administrator":
        debug and _debug_log("all permissions granted because user is Administrator")
        return allow_everything(doctype_meta.name)

    if not frappe.local.role_permissions.get(cache_key) or debug:
        perms = frappe._dict(if_owner={})

        roles = frappe.get_roles(user)
        debug and _debug_log("User has following roles: " + str(roles))

        def is_perm_applicable(perm):
            return perm.role in roles and cint(perm.permlevel) == 0

        def has_permission_without_if_owner_enabled(ptype):
            return any(p.get(ptype, 0) and not p.get("if_owner", 0) for p in applicable_permissions)

        applicable_permissions = list(filter(is_perm_applicable, getattr(doctype_meta, "permissions", [])))
        has_if_owner_enabled = any(p.get("if_owner", 0) for p in applicable_permissions)
        perms["has_if_owner_enabled"] = has_if_owner_enabled

        for ptype in get_rights(doctype_meta.name):
            pvalue = any(p.get(ptype, 0) for p in applicable_permissions)
            perms[ptype] = cint(pvalue)
            if (
                pvalue
                and has_if_owner_enabled
                and not has_permission_without_if_owner_enabled(ptype)
                and ptype != "create"
            ):
                perms["if_owner"][ptype] = cint(pvalue and is_owner)
                perms[ptype] = 1 if ptype in ("select", "read") else 0

        frappe.local.role_permissions[cache_key] = perms

    return frappe.local.role_permissions[cache_key]


def get_user_permissions(user):
    from frappe.core.doctype.user_permission.user_permission import get_user_permissions

    return get_user_permissions(user)


def get_roles(user=None, with_standard=True):
    """get roles of current user"""
    if not user:
        user = frappe.session.user

    if user == "Guest" or not user:
        return [GUEST_ROLE]

    def get():
        if user == "Administrator":
            return frappe.get_all("Role", pluck="name")
        else:
            table = DocType("Has Role")
            roles = (
                frappe.qb.from_(table)
                .where(
                    (table.parenttype == "User")
                    & (table.parent == user)
                    & (table.role.notin(AUTOMATIC_ROLES))
                )
                .select(table.role)
                .run(pluck=True)
            )
            roles += [ALL_USER_ROLE, GUEST_ROLE]
            if is_system_user(user):
                roles.append(SYSTEM_USER_ROLE)
            return roles

    roles = frappe.cache.hget("roles", user, get)

    if not with_standard:
        roles = [r for r in roles if r not in AUTOMATIC_ROLES]

    return roles


def update_permission_property(
    doctype,
    role,
    permlevel,
    ptype,
    value=None,
    validate=True,
    if_owner=0,
):
    """Update a property in Custom Perm"""
    from frappe.core.doctype.custom_docperm.custom_docperm import update_custom_docperm
    from frappe.core.doctype.doctype.doctype import validate_permissions_for_doctype

    out = setup_custom_perms(doctype)

    custom_docperm = frappe.db.get_value(
        "Custom DocPerm", dict(parent=doctype, role=role, permlevel=permlevel)
    )
    if custom_docperm:
        update_custom_docperm(custom_docperm, {ptype: value})

    if validate:
        validate_permissions_for_doctype(doctype)

    return out
