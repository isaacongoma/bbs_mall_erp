from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SupplierScorecardGenerated(FrappeModel):
    doctype = 'Supplier Scorecard'
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_score = models.CharField(max_length=140, blank=True, null=True, default='')
    indicator_color = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    period = models.CharField(max_length=140, blank=True, null=True, default='Per Month')
    weighting_function = models.TextField(blank=True, null=True, default='{total_score} * max( 0, min ( 1 , (12 - {period_number}) / 12) )')
    warn_rfqs = models.SmallIntegerField(default=0)
    warn_pos = models.SmallIntegerField(default=0)
    prevent_rfqs = models.SmallIntegerField(default=0)
    prevent_pos = models.SmallIntegerField(default=0)
    notify_supplier = models.SmallIntegerField(default=0)
    notify_employee = models.SmallIntegerField(default=0)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
