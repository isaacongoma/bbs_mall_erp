from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailCampaignGenerated(FrappeModel):
    doctype = 'Email Campaign'
    campaign_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    email_campaign_for = models.CharField(max_length=140, blank=True, null=True, default='Lead')
    recipient = models.CharField(max_length=140, blank=True, null=True, default='')
    sender = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
