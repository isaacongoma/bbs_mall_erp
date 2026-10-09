from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CampaignEmailScheduleGenerated(FrappeChildModel):
    doctype = 'Campaign Email Schedule'
    send_after_days = models.IntegerField(null=True, blank=True)
    email_template = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
