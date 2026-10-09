from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalesForecastGenerated(FrappeModel):
    doctype = 'Sales Forecast'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='SF.YY.-.######')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    parent_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    demand_number = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    frequency = models.CharField(max_length=140, blank=True, null=True, default='Monthly')

    class Meta:
        abstract = True
