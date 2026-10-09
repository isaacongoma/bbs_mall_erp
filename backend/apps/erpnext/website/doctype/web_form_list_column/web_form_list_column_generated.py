from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebFormListColumnGenerated(FrappeChildModel):
    doctype = 'Web Form List Column'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    options = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
