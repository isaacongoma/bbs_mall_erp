from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CrmNoteGenerated(FrappeChildModel):
    doctype = 'CRM Note'
    note = models.TextField(blank=True, null=True, default='')
    added_by = models.CharField(max_length=140, blank=True, null=True, default='')
    added_on = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
