from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppraisalTemplateGenerated(FrappeModel):
    doctype = 'Appraisal Template'
    description = models.TextField(blank=True, null=True, default='')
    template_title = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
