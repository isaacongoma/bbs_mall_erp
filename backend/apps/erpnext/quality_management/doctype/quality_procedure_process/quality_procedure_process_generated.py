from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityProcedureProcessGenerated(FrappeChildModel):
    doctype = 'Quality Procedure Process'
    process_description = models.TextField(blank=True, null=True, default='')
    procedure = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
