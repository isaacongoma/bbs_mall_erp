from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityActionResolutionGenerated(FrappeChildModel):
    doctype = 'Quality Action Resolution'
    problem = models.TextField(blank=True, null=True, default='')
    resolution = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    responsible = models.CharField(max_length=140, blank=True, null=True, default='')
    completion_by = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
