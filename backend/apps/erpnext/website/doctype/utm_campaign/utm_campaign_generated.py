from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class UtmCampaignGenerated(FrappeModel):
    doctype = 'UTM Campaign'
    campaign_description = models.TextField(blank=True, null=True, default='')
    slug = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
