from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeBenefitLedgerGenerated(FrappeModel):
    doctype = 'Employee Benefit Ledger'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_type = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    yearly_benefit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payroll_period = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')
    salary_slip = models.CharField(max_length=140, blank=True, null=True, default='')
    flexible_benefit = models.SmallIntegerField(default=0)
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
