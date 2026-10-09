from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MonthlyDistributionGenerated(FrappeModel):
    doctype = 'Monthly Distribution'
    distribution_id = models.CharField(max_length=140, blank=True, null=True, default='')
    fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
