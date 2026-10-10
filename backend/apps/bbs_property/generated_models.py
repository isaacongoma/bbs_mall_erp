from django.db import models

from apps.bbs_property.property_management.doctype.lease_agreement.lease_agreement_generated import LeaseAgreementGenerated
from apps.bbs_property.property_management.doctype.lease_billing_run.lease_billing_run_generated import LeaseBillingRunGenerated
from apps.bbs_property.property_management.doctype.lease_billing_run_item.lease_billing_run_item_generated import LeaseBillingRunItemGenerated
from apps.bbs_property.property_management.doctype.lease_charge.lease_charge_generated import LeaseChargeGenerated
from apps.bbs_property.property_management.doctype.lease_deposit.lease_deposit_generated import LeaseDepositGenerated
from apps.bbs_property.property_management.doctype.lease_document.lease_document_generated import LeaseDocumentGenerated
from apps.bbs_property.property_management.doctype.lease_rent_schedule.lease_rent_schedule_generated import LeaseRentScheduleGenerated
from apps.bbs_property.property_management.doctype.lease_unit.lease_unit_generated import LeaseUnitGenerated
from apps.bbs_property.property_management.doctype.maintenance_request.maintenance_request_generated import MaintenanceRequestGenerated
from apps.bbs_property.property_management.doctype.maintenance_update.maintenance_update_generated import MaintenanceUpdateGenerated
from apps.bbs_property.property_management.doctype.meter_reading.meter_reading_generated import MeterReadingGenerated
from apps.bbs_property.property_management.doctype.mpesa_payment.mpesa_payment_generated import MpesaPaymentGenerated
from apps.bbs_property.property_management.doctype.property.property_generated import PropertyGenerated
from apps.bbs_property.property_management.doctype.property_floor.property_floor_generated import PropertyFloorGenerated
from apps.bbs_property.property_management.doctype.rentable_unit.rentable_unit_generated import RentableUnitGenerated
from apps.bbs_property.property_management.doctype.space_enquiry.space_enquiry_generated import SpaceEnquiryGenerated
from apps.bbs_property.property_management.doctype.tenant_notice.tenant_notice_generated import TenantNoticeGenerated
from apps.bbs_property.property_management.doctype.tenant_notice_recipient.tenant_notice_recipient_generated import TenantNoticeRecipientGenerated
from apps.bbs_property.property_management.doctype.tenant_portal_user.tenant_portal_user_generated import TenantPortalUserGenerated
from apps.bbs_property.property_management.doctype.tenant_sales_declaration.tenant_sales_declaration_generated import TenantSalesDeclarationGenerated
from apps.bbs_property.property_management.doctype.utility_meter.utility_meter_generated import UtilityMeterGenerated
from apps.bbs_property.property_management.doctype.utility_tariff.utility_tariff_generated import UtilityTariffGenerated
from apps.bbs_property.property_management.doctype.utility_tariff_slab.utility_tariff_slab_generated import UtilityTariffSlabGenerated

class LeaseAgreement(LeaseAgreementGenerated):
    class Meta:
        db_table = 'tabLease Agreement'
        verbose_name = 'Lease Agreement'
        ordering = ['-creation']


class LeaseBillingRun(LeaseBillingRunGenerated):
    class Meta:
        db_table = 'tabLease Billing Run'
        verbose_name = 'Lease Billing Run'
        ordering = ['-creation']


class LeaseBillingRunItem(LeaseBillingRunItemGenerated):
    class Meta:
        db_table = 'tabLease Billing Run Item'
        verbose_name = 'Lease Billing Run Item'
        ordering = ['-creation']


class LeaseCharge(LeaseChargeGenerated):
    class Meta:
        db_table = 'tabLease Charge'
        verbose_name = 'Lease Charge'
        ordering = ['-creation']


class LeaseDeposit(LeaseDepositGenerated):
    class Meta:
        db_table = 'tabLease Deposit'
        verbose_name = 'Lease Deposit'
        ordering = ['-creation']


class LeaseDocument(LeaseDocumentGenerated):
    class Meta:
        db_table = 'tabLease Document'
        verbose_name = 'Lease Document'
        ordering = ['-creation']


class LeaseRentSchedule(LeaseRentScheduleGenerated):
    class Meta:
        db_table = 'tabLease Rent Schedule'
        verbose_name = 'Lease Rent Schedule'
        ordering = ['-creation']


class LeaseUnit(LeaseUnitGenerated):
    class Meta:
        db_table = 'tabLease Unit'
        verbose_name = 'Lease Unit'
        ordering = ['-creation']


class MaintenanceRequest(MaintenanceRequestGenerated):
    class Meta:
        db_table = 'tabMaintenance Request'
        verbose_name = 'Maintenance Request'
        ordering = ['-creation']


class MaintenanceUpdate(MaintenanceUpdateGenerated):
    class Meta:
        db_table = 'tabMaintenance Update'
        verbose_name = 'Maintenance Update'
        ordering = ['-creation']


class MeterReading(MeterReadingGenerated):
    class Meta:
        db_table = 'tabMeter Reading'
        verbose_name = 'Meter Reading'
        ordering = ['-creation']


class MpesaPayment(MpesaPaymentGenerated):
    class Meta:
        db_table = 'tabMpesa Payment'
        verbose_name = 'Mpesa Payment'
        ordering = ['-creation']


class Property(PropertyGenerated):
    class Meta:
        db_table = 'tabProperty'
        verbose_name = 'Property'
        ordering = ['-creation']


class PropertyFloor(PropertyFloorGenerated):
    class Meta:
        db_table = 'tabProperty Floor'
        verbose_name = 'Property Floor'
        ordering = ['-modified']


class RentableUnit(RentableUnitGenerated):
    class Meta:
        db_table = 'tabRentable Unit'
        verbose_name = 'Rentable Unit'
        ordering = ['-modified']


class SpaceEnquiry(SpaceEnquiryGenerated):
    class Meta:
        db_table = 'tabSpace Enquiry'
        verbose_name = 'Space Enquiry'
        ordering = ['-creation']


class TenantNotice(TenantNoticeGenerated):
    class Meta:
        db_table = 'tabTenant Notice'
        verbose_name = 'Tenant Notice'
        ordering = ['-creation']


class TenantNoticeRecipient(TenantNoticeRecipientGenerated):
    class Meta:
        db_table = 'tabTenant Notice Recipient'
        verbose_name = 'Tenant Notice Recipient'
        ordering = ['-creation']


class TenantPortalUser(TenantPortalUserGenerated):
    class Meta:
        db_table = 'tabTenant Portal User'
        verbose_name = 'Tenant Portal User'
        ordering = ['-creation']


class TenantSalesDeclaration(TenantSalesDeclarationGenerated):
    class Meta:
        db_table = 'tabTenant Sales Declaration'
        verbose_name = 'Tenant Sales Declaration'
        ordering = ['-creation']


class UtilityMeter(UtilityMeterGenerated):
    class Meta:
        db_table = 'tabUtility Meter'
        verbose_name = 'Utility Meter'
        ordering = ['-creation']


class UtilityTariff(UtilityTariffGenerated):
    class Meta:
        db_table = 'tabUtility Tariff'
        verbose_name = 'Utility Tariff'
        ordering = ['-creation']


class UtilityTariffSlab(UtilityTariffSlabGenerated):
    class Meta:
        db_table = 'tabUtility Tariff Slab'
        verbose_name = 'Utility Tariff Slab'
        ordering = ['-creation']


