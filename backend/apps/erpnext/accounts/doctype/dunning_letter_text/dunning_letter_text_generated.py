from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DunningLetterTextGenerated(FrappeChildModel):
    doctype = 'Dunning Letter Text'
    language = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default_language = models.SmallIntegerField(default=0)
    body_text = models.TextField(blank=True, null=True, default='')
    closing_text = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
