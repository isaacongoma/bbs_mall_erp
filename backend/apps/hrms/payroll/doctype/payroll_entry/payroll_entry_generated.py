from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PayrollEntryGenerated(FrappeModel):
    doctype = 'Payroll Entry'
    posting_date = models.DateField(null=True, blank=True)
    payroll_frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    number_of_employees = models.IntegerField(null=True, blank=True)
    validate_attendance = models.SmallIntegerField(default=0)
    salary_slip_based_on_timesheet = models.SmallIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    deduct_tax_for_unsubmitted_tax_exemption_proof = models.SmallIntegerField(default=0)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default=':Company')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_account = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    salary_slips_created = models.SmallIntegerField(default=0)
    salary_slips_submitted = models.SmallIntegerField(default=0)
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payroll_payable_account = models.CharField(max_length=140, blank=True, null=True, default='')
    error_message = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    grade = models.CharField(max_length=140, blank=True, null=True, default='')
    overtime_step = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
