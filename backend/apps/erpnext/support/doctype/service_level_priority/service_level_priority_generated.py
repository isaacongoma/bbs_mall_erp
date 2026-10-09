from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ServiceLevelPriorityGenerated(FrappeChildModel):
    doctype = 'Service Level Priority'
    priority = models.CharField(max_length=140, blank=True, null=True, default='')
    resolution_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    default_priority = models.SmallIntegerField(default=0)
    response_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
