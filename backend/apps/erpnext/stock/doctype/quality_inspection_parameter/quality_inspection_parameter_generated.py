from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityInspectionParameterGenerated(FrappeModel):
    doctype = 'Quality Inspection Parameter'
    parameter = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    parameter_group = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
