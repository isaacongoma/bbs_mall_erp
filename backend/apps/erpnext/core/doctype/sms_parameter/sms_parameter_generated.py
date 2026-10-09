from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SmsParameterGenerated(FrappeChildModel):
    doctype = 'SMS Parameter'
    parameter = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.CharField(max_length=255, blank=True, null=True, default='')
    header = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
