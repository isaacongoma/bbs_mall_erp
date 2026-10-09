from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExpenseClaimGenerated(FrappeModel):
    doctype = 'Expense Claim'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    expense_approver = models.CharField(max_length=140, blank=True, null=True, default='')
    approval_status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    total_claimed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_sanctioned_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_paid = models.SmallIntegerField(default=0)
    posting_date = models.DateField(null=True, blank=True)
    vehicle_log = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    total_amount_reimbursed = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    remark = models.TextField(blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    clearance_date = models.DateField(null=True, blank=True)
    payable_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    total_advance_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_taxes_and_charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    delivery_trip = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total_sanctioned_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total_advance_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total_taxes_and_charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total_claimed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    bank_or_cash_account = models.CharField(max_length=140, blank=True, null=True, default='')
    gain_loss_account = models.CharField(max_length=140, blank=True, null=True, default='')
    total_exchange_gain_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
