from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ActivityTypeGenerated(FrappeModel):
    doctype = 'Activity Type'
    activity_type = models.CharField(max_length=140, blank=True, null=True, default='')
    costing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    billing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
