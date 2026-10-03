# DRF wrappers around doc_api.py / view_settings_api.py -- the REST surface
# for what crm.api.doc / crm.fcrm.doctype.crm_view_settings.crm_view_settings
# expose as whitelisted RPC methods in the original.
from __future__ import annotations

import json

from django.core.exceptions import PermissionDenied
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from . import activities_api, boot_api, comment_api, doc_api, fields_layout_api, notifications_api, onboarding_api, search_api, session_api, view_settings_api


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except PermissionDenied as exc:
        raise DRFPermissionDenied(str(exc)) from exc
    except (ValueError, KeyError) as exc:
        raise ValidationError(str(exc)) from exc


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_data(request):
    p = request.data
    result = _guard(
        doc_api.get_data,
        doctype=p.get("doctype"), filters=p.get("filters") or {}, order_by=p.get("order_by", "modified desc"),
        page_length=int(p.get("page_length", 20)), page_length_count=int(p.get("page_length_count", 20)),
        column_field=p.get("column_field"), title_field=p.get("title_field"),
        columns=p.get("columns"), rows=p.get("rows"),
        kanban_columns=p.get("kanban_columns"), kanban_fields=p.get("kanban_fields"),
        view=p.get("view"), default_filters=p.get("default_filters"), user=request.user,
    )
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sort_options(request):
    return Response(_guard(doc_api.sort_options, request.query_params.get("doctype")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_filterable_fields(request):
    return Response(_guard(doc_api.get_filterable_fields, request.query_params.get("doctype")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_group_by_fields(request):
    return Response(_guard(doc_api.get_group_by_fields, request.query_params.get("doctype")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_quick_filters(request):
    return Response(_guard(doc_api.get_quick_filters, request.query_params.get("doctype")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_quick_filters(request):
    p = request.data
    # ViewControls.vue's saveQuickFilters() sends both as JSON-stringified
    # arrays (matching Frappe's own RPC param convention), not real JSON
    # arrays -- decode before use or `for f in quick_filters` iterates the
    # string character-by-character and silently empties the saved filter set.
    quick_filters = p.get("quick_filters") or []
    old_filters = p.get("old_filters") or []
    if isinstance(quick_filters, str):
        quick_filters = json.loads(quick_filters) if quick_filters else []
    if isinstance(old_filters, str):
        old_filters = json.loads(old_filters) if old_filters else []
    _guard(doc_api.update_quick_filters, doctype=p.get("doctype"), quick_filters=quick_filters, old_filters=old_filters)
    return Response({})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_assigned_users(request):
    return Response(_guard(
        doc_api.get_assigned_users, request.query_params.get("doctype"), request.query_params.get("name")
    ))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_seen(request):
    _guard(doc_api.add_seen, request.data.get("doctype"), request.data.get("name"), request.user)
    return Response({})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_fields(request):
    return Response(_guard(doc_api.get_fields, request.query_params.get("doctype")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_counts(request):
    return Response(_guard(
        doc_api.get_counts, request.query_params.get("doctype"), request.query_params.get("name")
    ))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_like(request):
    from apps.core.doctype.liked_document.liked_document import toggle_like as _toggle

    p = request.data
    _toggle(request.user, p.get("doctype"), p.get("name"), str(p.get("add", "No")).lower() in ("yes", "true", "1"))
    return Response({})


# -- View Settings ------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_view(request):
    return Response(_guard(view_settings_api.create, request.data.get("view") or {}, request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_view(request):
    return Response(_guard(view_settings_api.update, request.data.get("view") or {}, request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_view(request):
    _guard(view_settings_api.delete, request.data.get("name"), request.user)
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def public_view(request):
    _guard(view_settings_api.set_public, request.data.get("name"), request.data.get("value"), request.user)
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pin_view(request):
    _guard(view_settings_api.pin, request.data.get("name"), request.data.get("value"), request.user)
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_or_update_standard_view(request):
    result = _guard(
        view_settings_api.create_or_update_standard_view, request.data.get("view") or {}, request.user
    )
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_as_default_view(request):
    p = request.data
    _guard(
        view_settings_api.set_as_default, request.user,
        name=p.get("name"), type=p.get("type"), doctype=p.get("doctype"),
    )
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fetch_and_update_kanban_columns(request):
    result = _guard(view_settings_api.fetch_and_update_kanban_columns, request.data.get("name"))
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_views(request):
    return Response(_guard(doc_api.get_views, request.query_params.get("doctype"), request.user))


# -- Session (crm.api.session) ------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_get_users(request):
    include_all = request.query_params.get("include_all", False)
    users, crm_users = _guard(session_api.get_users, include_all, request.user)
    return Response([users, crm_users])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def session_get_user_info(request):
    return Response(_guard(session_api.get_user_info, request.data.get("users")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_get_organizations(request):
    return Response(_guard(session_api.get_organizations))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_doc_permissions(request):
    return Response(_guard(
        doc_api.get_doc_permissions, request.query_params.get("doctype"),
        request.query_params.get("docname"), request.user,
    ))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_value(request):
    p = request.data
    return Response(_guard(doc_api.get_value, p.get("doctype"), p.get("filters"), p.get("fieldname")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rename_doc(request):
    p = request.data
    return Response(_guard(doc_api.rename_doc, p.get("doctype"), p.get("old_name"), p.get("new_name")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_to_add(request):
    p = request.data
    _guard(doc_api.assign_to_add, p.get("doctype"), p.get("name"), p.get("assign_to") or [], p.get("bulk_assign", False), p.get("re_assign", False))
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_to_add_multiple(request):
    p = request.data
    _guard(doc_api.assign_to_add_multiple, p.get("doctype"), p.get("name"), p.get("assign_to") or [], p.get("bulk_assign", False), p.get("re_assign", False))
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_assignments(request):
    p = request.data
    _guard(doc_api.remove_assignments, p.get("doctype"), p.get("name"), p.get("assignees"))
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_to_remove_multiple(request):
    p = request.data
    _guard(doc_api.assign_to_remove_multiple, p.get("doctype"), p.get("names"), p.get("ignore_permissions", True))
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_update_docs(request):
    p = request.data
    failed = _guard(doc_api.bulk_update_docs, p.get("doctype"), p.get("docnames") or [], p.get("data") or {})
    return Response(failed)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_linked_docs_of_document(request):
    return Response(_guard(
        doc_api.get_linked_docs_of_document, request.query_params.get("doctype"), request.query_params.get("docname"),
    ))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_linked_doc_reference(request):
    p = request.data
    result = _guard(doc_api.remove_linked_doc_reference, p.get("items"), p.get("remove_contact", False), p.get("delete", False))
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_bulk_docs(request):
    p = request.data
    failed = _guard(doc_api.delete_bulk_docs, p.get("doctype"), p.get("items"), p.get("delete_linked", False))
    return Response(failed)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_file_uploader_defaults(request):
    return Response(_guard(doc_api.get_file_uploader_defaults, request.query_params.get("doctype")))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def delete_attachment(request):
    p = request.data
    _guard(doc_api.delete_attachment, p.get("doctype"), p.get("docname"), p.get("file_url"))
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def search_link(request):
    p = request.data
    result = _guard(
        search_api.search_link, p.get("doctype"), p.get("txt", ""),
        filters=p.get("filters"), page_length=int(p.get("page_length", 20)),
    )
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def search_emails(request):
    p = request.data
    result = _guard(search_api.search_emails, p.get("txt", ""))
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_fields_layout(request):
    p = request.query_params
    return Response(_guard(
        fields_layout_api.get_fields_layout, p.get("doctype"), p.get("type"),
        parent_doctype=p.get("parent_doctype"),
    ))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_fields_layout(request):
    p = request.data
    result = _guard(
        fields_layout_api.save_fields_layout, p.get("doctype"), p.get("type"), p.get("layout"), request.user,
    )
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_sidepanel_sections(request):
    return Response(_guard(fields_layout_api.get_sidepanel_sections, request.query_params.get("doctype")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def onboarding_get_first_lead(request):
    return Response(_guard(onboarding_api.get_first_lead, request.query_params.get("name")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def onboarding_get_first_deal(request):
    return Response(_guard(onboarding_api.get_first_deal, request.query_params.get("name")))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_apps(request):
    # frappe.apps.get_apps -- other Frappe apps installed on the site,
    # for the app-switcher menu (UserDropdown.vue). We have no such sibling
    # sites/apps concept -- an honestly empty list, not a fabricated one.
    return Response([])


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_onboarding_status(request):
    # frappe.onboarding.get_onboarding_status -- no persistence backend for
    # the onboarding checklist exists here, so this always reports a fresh
    # (empty) status; frappe-ui's useOnboarding composable seeds its own
    # step list client-side from AppSidebar.vue's setUp() call regardless.
    return Response({})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_onboarding_status(request):
    # frappe.onboarding.update_user_onboarding_status -- no-op; see
    # get_onboarding_status's note. The checklist still works within a
    # session (frappe-ui keeps it in localStorage), it just doesn't
    # round-trip through the server here.
    return Response({})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_signature(request):
    # crm.api.get_user_signature -- reads User.email_signature (a field we
    # don't model) falling back to an Email Account's signature (no email
    # account subsystem exists here). Honestly empty, matching the
    # original's own `return` (None) when neither is configured.
    return Response(request.user.email_signature or None)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_activities(request):
    result = _guard(activities_api.get_activities, request.query_params.get("name"))
    return Response(list(result))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_comment(request):
    p = request.data
    result = _guard(
        comment_api.add_comment, p.get("reference_doctype"), p.get("reference_name"), p.get("content"), request.user,
    )
    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    return Response(_guard(notifications_api.get_notifications, request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_notifications_read(request):
    _guard(notifications_api.mark_as_read, request.user, request.data.get("doc"))
    return Response({})


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def get_boot(request):
    # Mirrors the original's allow_guest=True -- this is called at app boot,
    # before login, to populate window.sysdefaults/translated_doctypes/etc.
    # for the Login page itself.
    return Response(boot_api.get_boot(request.user if request.user.is_authenticated else None))
