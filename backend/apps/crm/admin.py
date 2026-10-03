from django.contrib import admin

from apps.crm.doctype.call_log.call_log import CRMCallLog
from apps.crm.doctype.communication_status.communication_status import CRMCommunicationStatus
from apps.crm.doctype.currency.currency import Currency
from apps.crm.doctype.dashboard.dashboard import CRMDashboard
from apps.crm.doctype.deal.deal import CRMDeal
from apps.crm.doctype.deal_status.deal_status import CRMDealStatus
from apps.crm.doctype.enrichment_field_mapping.enrichment_field_mapping import CRMEnrichmentFieldMapping
from apps.crm.doctype.enrichment_rule.enrichment_rule import CRMEnrichmentRule
from apps.crm.doctype.enrichment_run.enrichment_run import CRMEnrichmentRun
from apps.crm.doctype.enrichment_settings.enrichment_settings import CRMEnrichmentSettings
from apps.crm.doctype.exotel_settings.exotel_settings import CRMExotelSettings
from apps.crm.doctype.holiday_list.holiday_list import CRMHolidayList
from apps.crm.doctype.industry.industry import CRMIndustry
from apps.crm.doctype.lead.lead import CRMLead
from apps.crm.doctype.lead_source.lead_source import CRMLeadSource
from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus
from apps.crm.doctype.lost_reason.lost_reason import CRMLostReason
from apps.crm.doctype.note.note import FCRMNote
from apps.crm.doctype.organization.organization import CRMOrganization
from apps.crm.doctype.service_level_agreement.service_level_agreement import CRMServiceLevelAgreement
from apps.crm.doctype.settings.settings import FCRMSettings
from apps.crm.doctype.task.task import CRMTask
from apps.crm.doctype.telephony_agent.telephony_agent import CRMTelephonyAgent
from apps.crm.doctype.territory.territory import CRMTerritory
from apps.crm.doctype.twilio_settings.twilio_settings import CRMTwilioSettings


@admin.register(CRMLead)
class CRMLeadAdmin(admin.ModelAdmin):
    list_display = ("name", "lead_name", "organization", "status", "email", "modified")
    search_fields = ("lead_name", "email", "organization")
    list_filter = ("status", "converted")


@admin.register(CRMDeal)
class CRMDealAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "status", "deal_owner", "modified")
    search_fields = ("organization_name", "email")
    list_filter = ("status",)


@admin.register(CRMOrganization)
class CRMOrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "website", "industry", "territory")
    search_fields = ("organization_name", "website")


admin.site.register(CRMLeadStatus)
admin.site.register(CRMDealStatus)
admin.site.register(CRMLeadSource)
admin.site.register(CRMIndustry)
admin.site.register(CRMTerritory)
admin.site.register(CRMLostReason)
admin.site.register(CRMCommunicationStatus)
admin.site.register(CRMServiceLevelAgreement)
admin.site.register(CRMHolidayList)
admin.site.register(Currency)
admin.site.register(FCRMSettings)
admin.site.register(CRMTask)
admin.site.register(FCRMNote)
admin.site.register(CRMCallLog)
admin.site.register(CRMDashboard)
admin.site.register(CRMTwilioSettings)
admin.site.register(CRMExotelSettings)
admin.site.register(CRMTelephonyAgent)
admin.site.register(CRMEnrichmentSettings)
admin.site.register(CRMEnrichmentRule)
admin.site.register(CRMEnrichmentFieldMapping)


@admin.register(CRMEnrichmentRun)
class CRMEnrichmentRunAdmin(admin.ModelAdmin):
    list_display = ("name", "reference_doctype", "reference_name", "status", "company_name", "modified")
    list_filter = ("status", "reference_doctype")
