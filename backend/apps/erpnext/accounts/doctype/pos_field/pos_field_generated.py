from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosFieldGenerated(FrappeChildModel):
    doctype = 'POS Field'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    options = models.TextField(blank=True, null=True, default='')
    reqd = models.SmallIntegerField(default=0)
    read_only = models.SmallIntegerField(default=0)
    default_value = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
