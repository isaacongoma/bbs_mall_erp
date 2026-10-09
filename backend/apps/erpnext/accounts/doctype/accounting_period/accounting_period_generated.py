from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AccountingPeriodGenerated(FrappeModel):
    doctype = 'Accounting Period'
    period_name = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    exempted_role = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
