from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class JobCardOperationGenerated(FrappeChildModel):
    doctype = 'Job Card Operation'
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    completed_time = models.CharField(max_length=140, blank=True, null=True, default='')
    sub_operation = models.CharField(max_length=140, blank=True, null=True, default='')
    completed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
