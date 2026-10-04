from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DepreciationScheduleGenerated(FrappeChildModel):
    doctype = 'Depreciation Schedule'
    schedule_date = models.DateField(null=True, blank=True)
    depreciation_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    accumulated_depreciation_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    shift = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
