from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PauseSlaOnStatusGenerated(FrappeChildModel):
    doctype = 'Pause SLA On Status'
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
