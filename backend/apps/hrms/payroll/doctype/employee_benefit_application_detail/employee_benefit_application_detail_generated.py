from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeBenefitApplicationDetailGenerated(FrappeChildModel):
    doctype = 'Employee Benefit Application Detail'
    max_benefit_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
