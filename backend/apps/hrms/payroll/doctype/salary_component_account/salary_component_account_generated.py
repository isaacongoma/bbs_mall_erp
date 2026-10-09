from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryComponentAccountGenerated(FrappeChildModel):
    doctype = 'Salary Component Account'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    liability_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
