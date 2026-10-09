from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class FiscalYearGenerated(FrappeModel):
    doctype = 'Fiscal Year'
    year = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    year_start_date = models.DateField(null=True, blank=True)
    year_end_date = models.DateField(null=True, blank=True)
    auto_created = models.SmallIntegerField(default=0)
    is_short_year = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
