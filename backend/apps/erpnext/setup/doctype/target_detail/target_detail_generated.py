from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TargetDetailGenerated(FrappeChildModel):
    doctype = 'Target Detail'
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    target_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    target_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    distribution_id = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
