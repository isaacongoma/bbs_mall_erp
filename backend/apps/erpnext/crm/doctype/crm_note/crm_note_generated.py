from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CrmNoteGenerated(FrappeChildModel):
    doctype = 'CRM Note'
    note = models.TextField(blank=True, null=True, default='')
    added_by = models.CharField(max_length=140, blank=True, null=True, default='')
    added_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
