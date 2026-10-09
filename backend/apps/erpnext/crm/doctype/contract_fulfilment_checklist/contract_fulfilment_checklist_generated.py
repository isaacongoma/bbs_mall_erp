from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ContractFulfilmentChecklistGenerated(FrappeChildModel):
    doctype = 'Contract Fulfilment Checklist'
    fulfilled = models.SmallIntegerField(default=0)
    requirement = models.CharField(max_length=140, blank=True, null=True, default='')
    notes = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
