from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ServiceDayGenerated(FrappeChildModel):
    doctype = 'Service Day'
    workday = models.CharField(max_length=140, blank=True, null=True, default='')
    start_time = FrappeTimeField(null=True, blank=True)
    end_time = FrappeTimeField(null=True, blank=True)

    class Meta:
        abstract = True
