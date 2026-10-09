from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeDependentAndBeneficiaryGenerated(FrappeModel):
    doctype = 'Employee Dependent and Beneficiary'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    first_name = models.CharField(max_length=140, blank=True, null=True, default='')
    middle_name = models.CharField(max_length=140, blank=True, null=True, default='')
    last_name = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    gender = models.CharField(max_length=140, blank=True, null=True, default='')
    dob = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    relationship = models.CharField(max_length=140, blank=True, null=True, default='')
    address = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
