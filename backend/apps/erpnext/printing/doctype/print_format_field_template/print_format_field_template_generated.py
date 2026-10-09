from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PrintFormatFieldTemplateGenerated(FrappeModel):
    doctype = 'Print Format Field Template'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    field = models.CharField(max_length=140, blank=True, null=True, default='')
    template = models.TextField(blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    template_file = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
