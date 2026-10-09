from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OvertimeTypeGenerated(FrappeModel):
    doctype = 'Overtime Type'
    overtime_salary_component = models.CharField(max_length=140, blank=True, null=True, default='')
    maximum_overtime_hours_allowed = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    standard_multiplier = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    applicable_for_weekend = models.SmallIntegerField(default=0)
    weekend_multiplier = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    applicable_for_public_holiday = models.SmallIntegerField(default=0)
    public_holiday_multiplier = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    overtime_calculation_method = models.CharField(max_length=140, blank=True, null=True, default='Salary Component Based')

    class Meta:
        abstract = True
