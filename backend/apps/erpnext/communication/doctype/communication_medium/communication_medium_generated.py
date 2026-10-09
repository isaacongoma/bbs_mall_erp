from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CommunicationMediumGenerated(FrappeModel):
    doctype = 'Communication Medium'
    communication_medium_type = models.CharField(max_length=140, blank=True, null=True, default='')
    catch_all = models.CharField(max_length=140, blank=True, null=True, default='')
    provider = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    communication_channel = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
