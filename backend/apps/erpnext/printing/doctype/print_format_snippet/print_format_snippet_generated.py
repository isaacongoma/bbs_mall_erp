from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PrintFormatSnippetGenerated(FrappeModel):
    doctype = 'Print Format Snippet'
    snippet_type = models.CharField(max_length=140, blank=True, null=True, default='Section')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
