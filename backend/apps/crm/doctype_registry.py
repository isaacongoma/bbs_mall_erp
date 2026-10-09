# Maps a Frappe-style doctype label (e.g. "CRM Lead") to its Django model.
# Used wherever code stores a doctype name as a plain string (Dynamic Link
# fields, the enrichment mapper, ToDo/DocShare reference_type, kanban
# column-field resolution) and needs to resolve it back to a real model at runtime.
def _registry() -> dict:
    from apps.core.doctype.system_settings.system_settings import SystemSettings
    from apps.core.models import User
    from apps.crm.doctype.call_log.call_log import CRMCallLog
    from apps.crm.doctype.communication_status.communication_status import CRMCommunicationStatus
    from apps.erpnext.registry import get_model
    from apps.crm.doctype.deal.deal import CRMDeal
    from apps.crm.doctype.deal_status.deal_status import CRMDealStatus
    from apps.crm.doctype.lead.lead import CRMLead
    from apps.crm.doctype.lead_status.lead_status import CRMLeadStatus
    from apps.crm.doctype.holiday_list.holiday_list import CRMHolidayList
    from apps.crm.doctype.invitation.invitation import CRMInvitation
    from apps.crm.doctype.note.note import FCRMNote
    from apps.crm.doctype.organization.organization import CRMOrganization
    from apps.crm.doctype.service_level_agreement.service_level_agreement import CRMServiceLevelAgreement
    from apps.crm.doctype.task.task import CRMTask

    # BBS-ERP Models
    from apps.property.models import Mall, Building, Floor, Unit
    from apps.leasing.models import Tenant, Lease, LeaseDocument
    from apps.iot.models import IoTGateway, IoTDevice, RegisteredVehicle, ParkingSession, SecurityEvent

    registry = {
        "CRM Lead": CRMLead,
        "CRM Deal": CRMDeal,
        "CRM Organization": CRMOrganization,
        "CRM Industry": get_model("Industry Type"),
        "CRM Task": CRMTask,
        "FCRM Note": FCRMNote,
        "CRM Call Log": CRMCallLog,
        "Contact": get_model("Contact"),
        "CRM Lead Status": CRMLeadStatus,
        "CRM Deal Status": CRMDealStatus,
        "CRM Lead Source": get_model("UTM Source"),
        "CRM Lost Reason": _canonical("Opportunity Lost Reason"),
        "CRM Invitation": CRMInvitation,
        "CRM Communication Status": CRMCommunicationStatus,
        "CRM Territory": get_model("Territory"),
        "Salutation": _canonical("Salutation"),
        "Gender": _canonical("Gender"),
        "Address": get_model("Address"),
        "User": User,
        "Currency": get_model("Currency"),
        "System Settings": SystemSettings,
        "Assignment Rule": get_model("Assignment Rule"),
        "CRM Service Level Agreement": CRMServiceLevelAgreement,
        "CRM Holiday List": CRMHolidayList,
        "Automation Flow": get_model("Automation Flow"),
        "Background Task": get_model("Background Task"),
        "Data Import": get_model("Data Import"),
        "Email Account": get_model("Email Account"),
        "Email Template": get_model("Email Template"),
        
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
    return {label: model for label, model in registry.items() if model is not None}


def _canonical(doctype):
    from apps.erpnext.registry import get_model

    try:
        return get_model(doctype)
    except LookupError:
        return None


def get_doctype_model(label: str):
    return _registry().get(label)


def list_doctype_labels() -> list[str]:
    """All doctype labels this registry knows how to resolve -- used where
    Frappe would reflect over every installed doctype's meta (e.g. finding
    which doctypes hold a Link back to a given one). We only have this fixed,
    curated set, not Frappe's full doctype registry."""
    return list(_registry().keys())
