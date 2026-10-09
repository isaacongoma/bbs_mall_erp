from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JournalEntryTemplateAccountGenerated(FrappeChildModel):
    doctype = 'Journal Entry Template Account'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
