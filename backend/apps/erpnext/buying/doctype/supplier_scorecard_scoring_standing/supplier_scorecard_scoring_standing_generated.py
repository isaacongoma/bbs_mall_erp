from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SupplierScorecardScoringStandingGenerated(FrappeChildModel):
    doctype = 'Supplier Scorecard Scoring Standing'
    standing_name = models.CharField(max_length=140, blank=True, null=True, default='')
    standing_color = models.CharField(max_length=140, blank=True, null=True, default='')
    min_grade = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_grade = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warn_rfqs = models.SmallIntegerField(default=0)
    warn_pos = models.SmallIntegerField(default=0)
    prevent_rfqs = models.SmallIntegerField(default=0)
    prevent_pos = models.SmallIntegerField(default=0)
    notify_supplier = models.SmallIntegerField(default=0)
    notify_employee = models.SmallIntegerField(default=0)
    employee_link = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
