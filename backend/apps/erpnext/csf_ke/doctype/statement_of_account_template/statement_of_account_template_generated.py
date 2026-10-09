from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class StatementOfAccountTemplateGenerated(FrappeModel):
    doctype = 'Statement of Account Template'
    report = models.CharField(max_length=140, blank=True, null=True, default='')
    template_name = models.CharField(max_length=140, blank=True, null=True, default='')
    template_path = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
