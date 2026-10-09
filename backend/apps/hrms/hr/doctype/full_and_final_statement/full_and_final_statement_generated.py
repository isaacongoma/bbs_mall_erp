from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class FullAndFinalStatementGenerated(FrappeModel):
    doctype = 'Full and Final Statement'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Unpaid')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    relieving_date = models.DateField(null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_date = models.DateField(null=True, blank=True)
    total_payable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_receivable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_asset_recovery_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
