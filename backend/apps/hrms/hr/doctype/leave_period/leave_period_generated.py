from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeavePeriodGenerated(FrappeModel):
    doctype = 'Leave Period'
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    is_active = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    optional_holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
