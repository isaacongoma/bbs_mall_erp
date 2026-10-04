from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WarrantyClaimGenerated(FrappeModel):
    doctype = 'Warranty Claim'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    complaint_date = models.DateField(null=True, blank=True)
    serial_no = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    complaint = models.TextField(blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    warranty_amc_status = models.CharField(max_length=140, blank=True, null=True, default='')
    warranty_expiry_date = models.DateField(null=True, blank=True)
    amc_expiry_date = models.DateField(null=True, blank=True)
    resolution_date = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=140, blank=True, null=True, default='')
    resolution_details = models.TextField(blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_display = models.TextField(blank=True, null=True, default='')
    contact_mobile = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_address = models.CharField(max_length=140, blank=True, null=True, default='')
    address_display = models.TextField(blank=True, null=True, default='')
    service_address = models.TextField(blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    complaint_raised_by = models.CharField(max_length=140, blank=True, null=True, default='')
    from_company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
