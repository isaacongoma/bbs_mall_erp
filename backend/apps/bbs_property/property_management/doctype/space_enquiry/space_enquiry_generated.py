from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SpaceEnquiryGenerated(FrappeModel):
    doctype = 'Space Enquiry'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='ENQ-.YYYY.-.####')
    prospect_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='New')
    business_type = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_phone = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    unit = models.CharField(max_length=140, blank=True, null=True, default='')
    required_area_sqm = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    budget_per_month = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expected_start = models.DateField(null=True, blank=True)
    assigned_to = models.CharField(max_length=140, blank=True, null=True, default='')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    lost_reason = models.TextField(blank=True, null=True, default='')
    notes = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
