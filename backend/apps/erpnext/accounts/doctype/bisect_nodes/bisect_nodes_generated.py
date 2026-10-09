from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BisectNodesGenerated(FrappeModel):
    doctype = 'Bisect Nodes'
    root = models.CharField(max_length=140, blank=True, null=True, default='')
    left_child = models.CharField(max_length=140, blank=True, null=True, default='')
    right_child = models.CharField(max_length=140, blank=True, null=True, default='')
    period_from_date = FrappeDateTimeField(null=True, blank=True)
    period_to_date = FrappeDateTimeField(null=True, blank=True)
    difference = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    balance_sheet_summary = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    profit_loss_summary = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    generated = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
