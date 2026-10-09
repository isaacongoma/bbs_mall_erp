from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class HolidayListAssignmentGenerated(FrappeModel):
    doctype = 'Holiday List Assignment'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    assigned_to = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_company = models.CharField(max_length=140, blank=True, null=True, default='')
    applicable_for = models.CharField(max_length=140, blank=True, null=True, default='')
    holiday_list_start = models.DateField(null=True, blank=True)
    holiday_list_end = models.DateField(null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
