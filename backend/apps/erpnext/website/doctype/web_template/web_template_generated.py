from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebTemplateGenerated(FrappeModel):
    doctype = 'Web Template'
    template = models.TextField(blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    type = models.CharField(max_length=140, blank=True, null=True, default='Section')
    module = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
