from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MasterProductionScheduleGenerated(FrappeModel):
    doctype = 'Master Production Schedule'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='MPS.YY.-.######')
    parent_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_forecast = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
