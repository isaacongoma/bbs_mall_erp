# Maps a Frappe-style doctype label (e.g. "CRM Lead") to its Django model.
# Used wherever code stores a doctype name as a plain string (Dynamic Link
# fields, the enrichment mapper, ToDo/DocShare reference_type, kanban
# column-field resolution) and needs to resolve it back to a real model at runtime.
def _registry() -> dict:
    from apps.core.doctype.address.address import Address
    from apps.core.doctype.assignment_rule.assignment_rule import AssignmentRule
    from apps.core.doctype.automation_flow.automation_flow import AutomationFlow
    from apps.core.doctype.background_task.background_task import BackgroundTask
    from apps.core.doctype.contact.contact import Contact
    from apps.core.doctype.data_import.data_import import DataImport
    from apps.core.doctype.email_account.email_account import EmailAccount
    from apps.core.doctype.email_template.email_template import EmailTemplate
    from apps.core.doctype.gender.gender import Gender
    from apps.core.doctype.salutation.salutation import Salutation
    from apps.core.doctype.system_settings.system_settings import SystemSettings
    from apps.core.models import User
    from apps.crm.doctype.call_log.call_log import CRMCallLog
    from apps.crm.doctype.communication_status.communication_status import CRMCommunicationStatus
    from apps.crm.doctype.currency.currency import Currency
    from apps.crm.doctype.deal.deal import CRMDeal
    from apps.crm.doctype.deal_status.deal_status import CRMDealStatus
    from apps.crm.doctype.industry.industry import CRMIndustry
    from apps.crm.doctype.lead.lead import CRMLead
    from apps.crm.doctype.lead_source.lead_source import CRMLeadSource
    from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus
    from apps.crm.doctype.holiday_list.holiday_list import CRMHolidayList
    from apps.crm.doctype.invitation.invitation import CRMInvitation
    from apps.crm.doctype.lost_reason.lost_reason import CRMLostReason
    from apps.crm.doctype.note.note import FCRMNote
    from apps.crm.doctype.organization.organization import CRMOrganization
    from apps.crm.doctype.service_level_agreement.service_level_agreement import CRMServiceLevelAgreement
    from apps.crm.doctype.task.task import CRMTask
    from apps.crm.doctype.territory.territory import CRMTerritory

    # BBS-ERP Models
    from apps.property.models import Mall, Building, Floor, Unit
    from apps.leasing.models import Tenant, Lease, LeaseDocument
    from apps.iot.models import IoTGateway, IoTDevice, RegisteredVehicle, ParkingSession, SecurityEvent

    return {
        "CRM Lead": CRMLead,
        "CRM Deal": CRMDeal,
        "CRM Organization": CRMOrganization,
        "CRM Industry": CRMIndustry,
        "CRM Task": CRMTask,
        "FCRM Note": FCRMNote,
        "CRM Call Log": CRMCallLog,
        "Contact": Contact,
        "CRM Lead Status": CRMLeadStatus,
        "CRM Deal Status": CRMDealStatus,
        "CRM Lead Source": CRMLeadSource,
        "CRM Lost Reason": CRMLostReason,
        "CRM Invitation": CRMInvitation,
        "CRM Communication Status": CRMCommunicationStatus,
        "CRM Territory": CRMTerritory,
        "Salutation": Salutation,
        "Gender": Gender,
        "Address": Address,
        "User": User,
        "Currency": Currency,
        "System Settings": SystemSettings,
        "Assignment Rule": AssignmentRule,
        "CRM Service Level Agreement": CRMServiceLevelAgreement,
        "CRM Holiday List": CRMHolidayList,
        "Automation Flow": AutomationFlow,
        "Background Task": BackgroundTask,
        "Data Import": DataImport,
        "Email Account": EmailAccount,
        "Email Template": EmailTemplate,
        
        # BBS-ERP Modules
        "Mall": Mall,
        "Building": Building,
        "Floor": Floor,
        "Unit": Unit,
        "Tenant": Tenant,
        "Lease": Lease,
        "Lease Document": LeaseDocument,
        "IoT Gateway": IoTGateway,
        "IoT Device": IoTDevice,
        "Registered Vehicle": RegisteredVehicle,
        "Parking Session": ParkingSession,
        "Security Event": SecurityEvent,
    }


def get_doctype_model(label: str):
    return _registry().get(label)


def list_doctype_labels() -> list[str]:
    """All doctype labels this registry knows how to resolve -- used where
    Frappe would reflect over every installed doctype's meta (e.g. finding
    which doctypes hold a Link back to a given one). We only have this fixed,
    curated set, not Frappe's full doctype registry."""
    return list(_registry().keys())
