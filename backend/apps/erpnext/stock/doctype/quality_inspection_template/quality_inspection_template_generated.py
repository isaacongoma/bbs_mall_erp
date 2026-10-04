from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class QualityInspectionTemplateGenerated(FrappeModel):
    doctype = 'Quality Inspection Template'
    quality_inspection_template_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
