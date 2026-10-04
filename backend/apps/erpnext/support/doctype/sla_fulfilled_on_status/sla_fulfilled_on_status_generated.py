from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SlaFulfilledOnStatusGenerated(FrappeChildModel):
    doctype = 'SLA Fulfilled On Status'
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
