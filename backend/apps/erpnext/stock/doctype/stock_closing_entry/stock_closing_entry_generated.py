from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class StockClosingEntryGenerated(FrappeModel):
    doctype = 'Stock Closing Entry'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
