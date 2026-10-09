from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobCardTimeLogGenerated(FrappeChildModel):
    doctype = 'Job Card Time Log'
    from_time = FrappeDateTimeField(null=True, blank=True)
    to_time = FrappeDateTimeField(null=True, blank=True)
    time_in_mins = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    completed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    operation = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
