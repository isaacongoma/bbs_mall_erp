from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebTemplateFieldGenerated(FrappeChildModel):
    doctype = 'Web Template Field'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='Data')
    reqd = models.SmallIntegerField(default=0)
    options = models.TextField(blank=True, null=True, default='')
    default = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
