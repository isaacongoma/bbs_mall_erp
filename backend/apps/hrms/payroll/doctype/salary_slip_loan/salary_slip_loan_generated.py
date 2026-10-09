from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalarySlipLoanGenerated(FrappeChildModel):
    doctype = 'Salary Slip Loan'
    loan = models.CharField(max_length=140, blank=True, null=True, default='')
    loan_account = models.CharField(max_length=140, blank=True, null=True, default='')
    interest_income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    principal_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    interest_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_payment = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    loan_repayment_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    loan_product = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
