from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemStandardCostGenerated(FrappeModel):
    doctype = 'Item Standard Cost'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='ISC-.YYYY.-')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    standard_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    revaluation_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
