from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeActionGenerated(FrappeChildModel):
    doctype = 'DocType Action'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    group = models.CharField(max_length=140, blank=True, null=True, default='')
    action_type = models.CharField(max_length=140, blank=True, null=True, default='')
    action = models.TextField(blank=True, null=True, default='')
    hidden = models.SmallIntegerField(default=0)
    custom = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
