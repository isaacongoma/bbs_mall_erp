from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class IssueGenerated(FrappeModel):
    doctype = 'Issue'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    raised_by = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    priority = models.CharField(max_length=140, blank=True, null=True, default='')
    issue_type = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    service_level_agreement = models.CharField(max_length=140, blank=True, null=True, default='')
    response_by = models.DateTimeField(null=True, blank=True)
    first_responded_on = models.DateTimeField(null=True, blank=True)
    lead = models.CharField(max_length=140, blank=True, null=True, default='')
    contact = models.CharField(max_length=140, blank=True, null=True, default='')
    email_account = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    resolution_details = models.TextField(blank=True, null=True, default='')
    opening_date = models.DateField(null=True, blank=True)
    opening_time = models.TimeField(null=True, blank=True)
    content_type = models.CharField(max_length=140, blank=True, null=True, default='')
    attachment = models.TextField(blank=True, null=True, default='')
    via_customer_portal = models.SmallIntegerField(default=0)
    service_level_agreement_creation = models.DateTimeField(null=True, blank=True)
    issue_split_from = models.CharField(max_length=140, blank=True, null=True, default='')
    avg_response_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    resolution_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    user_resolution_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    on_hold_since = models.DateTimeField(null=True, blank=True)
    total_hold_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    agreement_status = models.CharField(max_length=140, blank=True, null=True, default='First Response Due')
    first_response_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sla_resolution_by = models.DateTimeField(null=True, blank=True)
    sla_resolution_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
