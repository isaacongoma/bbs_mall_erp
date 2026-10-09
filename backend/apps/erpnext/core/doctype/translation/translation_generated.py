from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TranslationGenerated(FrappeModel):
    doctype = 'Translation'
    language = models.CharField(max_length=140, blank=True, null=True, default='')
    context = models.CharField(max_length=140, blank=True, null=True, default='')
    contributed = models.SmallIntegerField(default=0)
    contribution_status = models.CharField(max_length=140, blank=True, null=True, default='')
    contribution_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    source_text = models.TextField(blank=True, null=True, default='')
    translated_text = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
