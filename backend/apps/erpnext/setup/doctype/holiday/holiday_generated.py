from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class HolidayGenerated(FrappeChildModel):
    doctype = 'Holiday'
    holiday_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    weekly_off = models.SmallIntegerField(default=0)
    is_half_day = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
