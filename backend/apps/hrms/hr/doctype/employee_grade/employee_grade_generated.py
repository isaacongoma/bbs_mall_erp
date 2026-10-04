from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EmployeeGradeGenerated(FrappeModel):
    doctype = 'Employee Grade'
    default_salary_structure = models.CharField(max_length=140, blank=True, null=True, default='')
    default_base_pay = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
