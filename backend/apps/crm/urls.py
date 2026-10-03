from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.core.automation_engine import api_views as automation_api_views
from apps.core.doctype.assignment_rule.assignment_rule_views import (
    AssignmentRuleViewSet, duplicate_assignment_rule, get_assignment_rules_list,
)
from apps.core.doctype.automation_flow.automation_flow_views import AutomationFlowViewSet
from apps.core.doctype.background_task.background_task_views import BackgroundTaskViewSet
from apps.core.doctype.contact import contact_views
from apps.core.doctype.data_import import data_import_views
from apps.core.doctype.email_account.email_account_views import EmailAccountViewSet
from apps.core.doctype.email_template.email_template_views import EmailTemplateViewSet
from apps.core.doctype.contact.contact_views import ContactViewSet
from apps.core.system_settings_views import get_system_settings, update_system_settings
from apps.core.user_views import UserViewSet, get_timezones as user_get_timezones
from apps.core.doctype.web_form import public_views as web_form_public_views
from apps.core.doctype.web_form import web_form_views
from apps.crm.dashboard_views import chart_options_view, dashboard_view, chart_view, reset_to_default_view
from apps.crm.doctype.call_log.call_log_views import CRMCallLogViewSet
from apps.crm.doctype.deal.deal_views import CRMDealViewSet
from apps.crm.doctype.holiday_list.holiday_list_views import CRMHolidayListViewSet
from apps.crm.doctype.lead.lead_views import CRMLeadViewSet
from apps.crm.doctype.lead_sync_source import lead_sync_source_views as lead_sync_views
from apps.crm.doctype.note.note_views import FCRMNoteViewSet
from apps.crm.doctype.sales_hierarchy.sales_hierarchy_views import SalesHierarchyViewSet
from apps.crm.doctype.organization.organization_views import CRMOrganizationViewSet
from apps.crm.doctype.service_level_agreement.service_level_agreement_views import (
    CRMServiceLevelAgreementViewSet,
)
from apps.crm.doctype.task.task_views import CRMTaskViewSet
from apps.crm.domain_enrichment.api import enrich as enrichment_enrich
from apps.crm.domain_enrichment.api import retry as enrichment_retry
from apps.crm.integrations import common_views, integration_settings_views, exotel_views, twilio_views, whatsapp_views
from apps.crm import comment_views, doc_views, settings_views, status_views, user_management_views

router = DefaultRouter()
router.register("leads", CRMLeadViewSet, basename="lead")
router.register("deals", CRMDealViewSet, basename="deal")
router.register("tasks", CRMTaskViewSet, basename="task")
router.register("notes", FCRMNoteViewSet, basename="note")
router.register("call-logs", CRMCallLogViewSet, basename="call-log")
router.register("lead-statuses", status_views.CRMLeadStatusViewSet, basename="lead-status")
router.register("deal-statuses", status_views.CRMDealStatusViewSet, basename="deal-status")
router.register("communication-statuses", status_views.CRMCommunicationStatusViewSet, basename="communication-status")
router.register("comments", comment_views.CommentViewSet, basename="comment")
router.register("form-scripts", status_views.CRMFormScriptViewSet, basename="form-script")
router.register("salutations", status_views.SalutationViewSet, basename="salutation")
router.register("genders", status_views.GenderViewSet, basename="gender")
router.register("addresses", status_views.AddressViewSet, basename="address")
router.register("contacts", ContactViewSet, basename="contact")
router.register("organizations", CRMOrganizationViewSet, basename="organization")
router.register("users", UserViewSet, basename="user")
router.register("assignment-rules", AssignmentRuleViewSet, basename="assignment-rule")
router.register("sla-policies", CRMServiceLevelAgreementViewSet, basename="sla-policy")
router.register("holiday-lists", CRMHolidayListViewSet, basename="holiday-list")
router.register("automation-flows", AutomationFlowViewSet, basename="automation-flow")
router.register("background-tasks", BackgroundTaskViewSet, basename="background-task")
router.register("invitations", user_management_views.CRMInvitationViewSet, basename="invitation")
router.register("telephony-agents", integration_settings_views.TelephonyAgentViewSet, basename="telephony-agent")
router.register("lead-sync-sources", lead_sync_views.LeadSyncSourceViewSet, basename="lead-sync-source")
router.register("facebook-pages", lead_sync_views.FacebookPageViewSet, basename="facebook-page")
router.register("facebook-lead-forms", lead_sync_views.FacebookLeadFormViewSet, basename="facebook-lead-form")
router.register("failed-lead-sync-logs", lead_sync_views.FailedLeadSyncLogViewSet, basename="failed-lead-sync-log")
router.register("sales-hierarchy", SalesHierarchyViewSet, basename="sales-hierarchy")
router.register("data-imports", data_import_views.DataImportViewSet, basename="data-import")
router.register("email-accounts", EmailAccountViewSet, basename="email-account")
router.register("email-templates", EmailTemplateViewSet, basename="email-template")

urlpatterns = [
    path("user-management/update-role/", user_management_views.update_user_role, name="user-update-role"),
    path("user-management/remove/", user_management_views.remove_crm_roles_from_user, name="user-remove"),
    path("user-management/add-existing/", user_management_views.add_existing_users, name="user-add-existing"),
    path("user-management/invite/", user_management_views.invite_by_email, name="user-invite"),
    path("data-imports/preview/", data_import_views.preview_view, name="data-import-preview"),
    path("data-imports/start/", data_import_views.start_view, name="data-import-start"),
    path("data-imports/logs/", data_import_views.logs_view, name="data-import-logs"),
    path("data-imports/template/", data_import_views.template_view, name="data-import-template"),
] + router.urls + [
    path("dashboard/", dashboard_view, name="dashboard"),
    path("dashboard/chart-options/", chart_options_view, name="dashboard-chart-options"),
    path("dashboard/chart/", chart_view, name="dashboard-chart"),
    path("dashboard/reset/", reset_to_default_view, name="dashboard-reset"),
    path("enrichment/enrich/", enrichment_enrich, name="enrichment-enrich"),
    path("enrichment/retry/", enrichment_retry, name="enrichment-retry"),

    # Telephony: shared
    path("telephony/recording/<str:call_log_name>/", common_views.get_recording_url, name="telephony-recording"),
    path("telephony/notes/", common_views.add_note_to_call_log, name="telephony-add-note"),
    path("telephony/tasks/", common_views.add_task_to_call_log, name="telephony-add-task"),
    path("telephony/status/", common_views.is_call_integration_enabled, name="telephony-status"),
    path("telephony/default-medium/", common_views.set_default_calling_medium, name="telephony-default-medium"),

    # Telephony: Twilio
    path("integrations/twilio/settings/", integration_settings_views.twilio_settings, name="twilio-settings"),
    path("integrations/twilio/fetch-applications/", integration_settings_views.twilio_fetch_applications, name="twilio-fetch-applications"),
    path("integrations/exotel/settings/", integration_settings_views.exotel_settings, name="exotel-settings"),
    path("integrations/twilio/enabled/", twilio_views.is_enabled, name="twilio-enabled"),
    path("integrations/twilio/access-token/", twilio_views.generate_access_token, name="twilio-access-token"),
    path("integrations/twilio/voice/", twilio_views.voice, name="twilio-voice"),
    path("integrations/twilio/incoming/", twilio_views.twilio_incoming_call_handler, name="twilio-incoming"),
    path("integrations/twilio/recording-status/", twilio_views.update_recording_info, name="twilio-recording-status"),
    path("integrations/twilio/call-status/", twilio_views.update_call_status_info, name="twilio-call-status"),

    # Telephony: Exotel
    path("integrations/exotel/webhook/", exotel_views.handle_request, name="exotel-webhook"),
    path("integrations/exotel/call/", exotel_views.make_a_call, name="exotel-call"),
    path("integrations/exotel/enabled/", exotel_views.is_enabled, name="exotel-enabled"),

    # WhatsApp (thin shim -- see apps/crm/integrations/whatsapp_views.py docstring)
    path("integrations/whatsapp/enabled/", whatsapp_views.is_whatsapp_enabled, name="whatsapp-enabled"),
    path("integrations/whatsapp/installed/", whatsapp_views.is_whatsapp_installed, name="whatsapp-installed"),
    path("integrations/whatsapp/messages/", whatsapp_views.get_whatsapp_messages, name="whatsapp-messages"),

    # Generic doc/list engine (crm.api.doc)
    path("doc/get-data/", doc_views.get_data, name="doc-get-data"),
    path("doc/sort-options/", doc_views.sort_options, name="doc-sort-options"),
    path("doc/filterable-fields/", doc_views.get_filterable_fields, name="doc-filterable-fields"),
    path("doc/group-by-fields/", doc_views.get_group_by_fields, name="doc-group-by-fields"),
    path("doc/quick-filters/", doc_views.get_quick_filters, name="doc-quick-filters"),
    path("doc/quick-filters/update/", doc_views.update_quick_filters, name="doc-quick-filters-update"),
    path("doc/assigned-users/", doc_views.get_assigned_users, name="doc-assigned-users"),
    path("doc/add-seen/", doc_views.add_seen, name="doc-add-seen"),
    path("doc/fields/", doc_views.get_fields, name="doc-fields"),
    path("doc/counts/", doc_views.get_counts, name="doc-counts"),
    path("doc/toggle-like/", doc_views.toggle_like, name="doc-toggle-like"),
    path("doc/views/", doc_views.get_views, name="doc-views"),
    path("doc/search-link/", doc_views.search_link, name="doc-search-link"),
    path("doc/permissions/", doc_views.get_doc_permissions, name="doc-permissions"),
    path("doc/get-value/", doc_views.get_value, name="doc-get-value"),
    path("doc/rename/", doc_views.rename_doc, name="doc-rename"),
    path("doc/delete-attachment/", doc_views.delete_attachment, name="doc-delete-attachment"),
    path("doc/file-uploader-defaults/", doc_views.get_file_uploader_defaults, name="doc-file-uploader-defaults"),
    path("doc/assign-to/add/", doc_views.assign_to_add, name="doc-assign-to-add"),
    path("doc/assign-to/add-multiple/", doc_views.assign_to_add_multiple, name="doc-assign-to-add-multiple"),
    path("doc/assign-to/remove/", doc_views.remove_assignments, name="doc-assign-to-remove"),
    path("doc/assign-to/remove-multiple/", doc_views.assign_to_remove_multiple, name="doc-assign-to-remove-multiple"),
    path("doc/bulk-update/", doc_views.bulk_update_docs, name="doc-bulk-update"),
    path("doc/linked-docs/", doc_views.get_linked_docs_of_document, name="doc-linked-docs"),
    path("doc/remove-linked-doc-reference/", doc_views.remove_linked_doc_reference, name="doc-remove-linked-doc-reference"),
    path("doc/delete-bulk/", doc_views.delete_bulk_docs, name="doc-delete-bulk"),

    # Fields Layout (crm.fcrm.doctype.crm_fields_layout.crm_fields_layout)
    path("fields-layout/", doc_views.get_fields_layout, name="fields-layout"),
    path("fields-layout/save/", doc_views.save_fields_layout, name="fields-layout-save"),
    path("fields-layout/sidepanel/", doc_views.get_sidepanel_sections, name="fields-layout-sidepanel"),

    # Onboarding / app boot misc
    path("onboarding/first-lead/", doc_views.onboarding_get_first_lead, name="onboarding-first-lead"),
    path("onboarding/first-deal/", doc_views.onboarding_get_first_deal, name="onboarding-first-deal"),
    path("onboarding/status/", doc_views.get_onboarding_status, name="onboarding-status"),
    path("onboarding/status/update/", doc_views.update_onboarding_status, name="onboarding-status-update"),
    path("apps/", doc_views.get_apps, name="get-apps"),

    # Activities / Comments (crm.api.activities / crm.api.comment)
    path("activities/", doc_views.get_activities, name="get-activities"),
    path("user-signature/", doc_views.get_user_signature, name="get-user-signature"),
    path("add-comment/", doc_views.add_comment, name="add-comment"),
    path("search-emails/", doc_views.search_emails, name="search-emails"),
    path("assignment-rules-list/", get_assignment_rules_list, name="assignment-rules-list"),
    path("assignment-rules-duplicate/", duplicate_assignment_rule, name="assignment-rules-duplicate"),
    path("user-timezones/", user_get_timezones, name="user-timezones"),

    # Contact (crm.api.contact) -- named to not collide with the "contacts"
    # router's own contacts/<pk>/ detail-route pattern.
    path("contact-linked-deals/", contact_views.get_linked_deals, name="contact-linked-deals"),
    path("contact-create-new/", contact_views.create_new, name="contact-create-new"),
    path("contact-set-primary/", contact_views.set_as_primary, name="contact-set-primary"),

    # Notifications (crm.api.notifications)
    path("notifications/", doc_views.get_notifications, name="get-notifications"),
    path("notifications/mark-read/", doc_views.mark_notifications_read, name="notifications-mark-read"),

    # View Settings (crm.fcrm.doctype.crm_view_settings.crm_view_settings)
    path("views/create/", doc_views.create_view, name="view-create"),
    path("views/update/", doc_views.update_view, name="view-update"),
    path("views/delete/", doc_views.delete_view, name="view-delete"),
    path("views/public/", doc_views.public_view, name="view-public"),
    path("views/pin/", doc_views.pin_view, name="view-pin"),
    path("views/standard/", doc_views.create_or_update_standard_view, name="view-standard"),
    path("views/set-default/", doc_views.set_as_default_view, name="view-set-default"),
    path("views/kanban-columns/", doc_views.fetch_and_update_kanban_columns, name="view-kanban-columns"),

    # Session (crm.api.session)
    path("session/users/", doc_views.session_get_users, name="session-users"),
    path("session/user-info/", doc_views.session_get_user_info, name="session-user-info"),
    path("session/organizations/", doc_views.session_get_organizations, name="session-organizations"),
    path("session/boot/", doc_views.get_boot, name="session-boot"),

    # FCRM Settings (Frappe Single doctype -> Django singleton)
    path("settings/", settings_views.get_settings, name="fcrm-settings"),
    path("settings/update/", settings_views.update_settings, name="fcrm-settings-update"),

    # System Settings (Frappe core Single doctype -> Django singleton)
    path("system-settings/", get_system_settings, name="get-system-settings"),
    path("system-settings/update/", update_system_settings, name="update-system-settings"),

    # Automation Flow engine (frappe.automation_engine.api)
    path("automation-capabilities/", automation_api_views.get_automation_capabilities, name="automation-capabilities"),
    path("automation-validate-params/", automation_api_views.validate_action_params, name="automation-validate-params"),
    path("automation-param-options/", automation_api_views.get_param_options, name="automation-param-options"),
    path("automation-run-manually/", automation_api_views.run_manually, name="automation-run-manually"),
    path("automation-trial-run/", automation_api_views.trial_run, name="automation-trial-run"),
    path("automation-runs/", automation_api_views.get_runs, name="automation-runs"),

    # Forms builder (crm.api.form)
    path("form-fields/", web_form_views.get_form_fields, name="form-fields"),
    path("form-hidden-seed/", web_form_views.get_hidden_seed, name="form-hidden-seed"),
    path("form-link-guest-access/", web_form_views.link_field_guest_access, name="form-link-guest-access"),
    path("form-grant-guest-access/", web_form_views.grant_guest_link_access, name="form-grant-guest-access"),
    path("forms/", web_form_views.list_forms, name="forms-list"),
    path("forms/config/", web_form_views.get_form_config, name="forms-config"),
    path("forms/save/", web_form_views.save_form, name="forms-save"),
    path("forms/publish/", web_form_views.set_published, name="forms-publish"),
    path("forms/delete/", web_form_views.delete_form, name="forms-delete"),
    path("forms/test-submit/", web_form_views.test_submit_form, name="forms-test-submit"),

    # Public web form submission (guest-accessible; see apps/core/doctype/web_form/public_views.py)
    path("web-form/submit/", web_form_public_views.submit_form, name="web-form-submit"),
]
