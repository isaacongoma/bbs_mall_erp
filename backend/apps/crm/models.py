# Django discovers models via this module. Each model's real source lives
# next to its doctype definition under doctype/<name>/<name>.py; this file
# only re-exports them so the app registry picks them up.
from apps.crm.doctype.call_log.call_log import CRMCallLog  # noqa: F401
from apps.crm.doctype.call_log_link.call_log_link import CallLogLink  # noqa: F401
from apps.crm.doctype.communication_status.communication_status import CRMCommunicationStatus  # noqa: F401
from apps.crm.doctype.dashboard.dashboard import CRMDashboard  # noqa: F401
from apps.crm.doctype.deal.deal import CRMDeal  # noqa: F401
from apps.crm.doctype.deal_contacts.deal_contacts import CRMDealContact  # noqa: F401
from apps.crm.doctype.deal_status.deal_status import CRMDealStatus  # noqa: F401
from apps.crm.doctype.dropdown_item.dropdown_item import CRMDropdownItem  # noqa: F401
from apps.crm.doctype.enrichment_domain.enrichment_domain import CRMEnrichmentDomain  # noqa: F401
from apps.crm.doctype.enrichment_field_mapping.enrichment_field_mapping import (  # noqa: F401
    CRMEnrichmentFieldMapping,
)
from apps.crm.doctype.enrichment_link_priority.enrichment_link_priority import (  # noqa: F401
    CRMEnrichmentLinkPriority,
)
from apps.crm.doctype.enrichment_rule.enrichment_rule import CRMEnrichmentRule  # noqa: F401
from apps.crm.doctype.enrichment_rule_pattern.enrichment_rule_pattern import CRMEnrichmentRulePattern  # noqa: F401
from apps.crm.doctype.enrichment_run.enrichment_run import CRMEnrichmentRun  # noqa: F401
from apps.crm.doctype.enrichment_settings.enrichment_settings import CRMEnrichmentSettings  # noqa: F401
from apps.crm.doctype.enrichment_skip_pattern.enrichment_skip_pattern import CRMEnrichmentSkipPattern  # noqa: F401
from apps.crm.doctype.exotel_settings.exotel_settings import CRMExotelSettings  # noqa: F401
from apps.crm.doctype.fields_layout.fields_layout import CRMFieldsLayout  # noqa: F401
from apps.crm.doctype.form_script.form_script import CRMFormScript  # noqa: F401
from apps.crm.doctype.global_settings.global_settings import CRMGlobalSettings  # noqa: F401
from apps.crm.doctype.holiday.holiday import CRMHoliday  # noqa: F401
from apps.crm.doctype.holiday_list.holiday_list import CRMHolidayList  # noqa: F401
from apps.crm.doctype.notification.notification import CRMNotification  # noqa: F401
from apps.crm.doctype.lead.lead import CRMLead  # noqa: F401
from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus  # noqa: F401
from apps.crm.doctype.invitation.invitation import CRMInvitation  # noqa: F401
from apps.crm.doctype.note.note import FCRMNote  # noqa: F401
from apps.crm.doctype.organization.organization import CRMOrganization  # noqa: F401
from apps.crm.doctype.products.products import CRMProductRow  # noqa: F401
from apps.crm.doctype.quick_filter_override.quick_filter_override import QuickFilterOverride  # noqa: F401
from apps.crm.doctype.rolling_response_time.rolling_response_time import CRMRollingResponseTime  # noqa: F401
from apps.crm.doctype.service_day.service_day import CRMServiceDay  # noqa: F401
from apps.crm.doctype.service_level_agreement.service_level_agreement import (  # noqa: F401
    CRMServiceLevelAgreement,
)
from apps.crm.doctype.service_level_priority.service_level_priority import CRMServiceLevelPriority  # noqa: F401
from apps.crm.doctype.settings.settings import FCRMSettings  # noqa: F401
from apps.crm.doctype.status_change_log.status_change_log import CRMStatusChangeLog  # noqa: F401
from apps.crm.doctype.task.task import CRMTask  # noqa: F401
from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent  # noqa: F401
from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings  # noqa: F401
from apps.crm.doctype.view_settings.view_settings import CRMViewSettings  # noqa: F401
from apps.crm.doctype.lead_sync_source.lead_sync_source import (  # noqa: F401
    FacebookLeadForm,
    FacebookLeadFormQuestion,
    FacebookPage,
    FailedLeadSyncLog,
    LeadSyncSource,
)
from apps.crm.doctype.sales_hierarchy.sales_hierarchy import SalesHierarchy  # noqa: F401
