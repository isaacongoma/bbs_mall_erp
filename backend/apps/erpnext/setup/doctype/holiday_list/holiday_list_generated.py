from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class HolidayListGenerated(FrappeModel):
    doctype = 'Holiday List'
    holiday_list_name = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    total_holidays = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    weekly_off = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    subdivision = models.CharField(max_length=140, blank=True, null=True, default='')
    is_half_day = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
