from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductionPlanScheduleGenerated(FrappeModel):
    doctype = 'Production Plan Schedule'
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    production_plan = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    row_type = models.CharField(max_length=140, blank=True, null=True, default='')
    plan_row = models.CharField(max_length=140, blank=True, null=True, default='')
    task_key = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    from_time = FrappeDateTimeField(null=True, blank=True)
    to_time = FrappeDateTimeField(null=True, blank=True)
    duration_mins = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
