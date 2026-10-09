from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DoctypeStateGenerated(FrappeChildModel):
    doctype = 'DocType State'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='Blue')
    custom = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
