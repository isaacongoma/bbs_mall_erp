from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeavePolicyDetailGenerated(FrappeChildModel):
    doctype = 'Leave Policy Detail'
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    annual_allocation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
