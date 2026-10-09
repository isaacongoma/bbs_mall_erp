from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityInspectionParameterGroupGenerated(FrappeModel):
    doctype = 'Quality Inspection Parameter Group'
    group_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
