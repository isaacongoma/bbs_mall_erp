from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryWithholdingCycleGenerated(FrappeChildModel):
    doctype = 'Salary Withholding Cycle'
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    is_salary_released = models.SmallIntegerField(default=0)
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
