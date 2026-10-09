from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShiftScheduleGenerated(FrappeModel):
    doctype = 'Shift Schedule'
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_type = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
