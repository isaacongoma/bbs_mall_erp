from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OvertimeSalaryComponentGenerated(FrappeChildModel):
    doctype = 'Overtime Salary Component'
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
