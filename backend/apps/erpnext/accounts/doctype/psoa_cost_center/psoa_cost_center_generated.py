from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PsoaCostCenterGenerated(FrappeChildModel):
    doctype = 'PSOA Cost Center'
    cost_center_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
