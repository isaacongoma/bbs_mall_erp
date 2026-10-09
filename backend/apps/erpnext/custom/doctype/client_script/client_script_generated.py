from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ClientScriptGenerated(FrappeModel):
    doctype = 'Client Script'
    dt = models.CharField(max_length=140, blank=True, null=True, default='')
    script = models.TextField(blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=0)
    view = models.CharField(max_length=140, blank=True, null=True, default='Form')
    module = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
