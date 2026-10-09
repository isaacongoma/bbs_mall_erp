from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GratuityGenerated(FrappeModel):
    doctype = 'Gratuity'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    current_work_experience = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    gratuity_rule = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payable_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    pay_via_salary_slip = models.SmallIntegerField(default=1)
    payroll_date = models.DateField(null=True, blank=True)
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
