from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryStructureAssignmentGenerated(FrappeModel):
    doctype = 'Salary Structure Assignment'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    salary_structure = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    base = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    annual_gross_earning = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ctc = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    variable = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    income_tax_slab = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    payroll_payable_account = models.CharField(max_length=140, blank=True, null=True, default='')
    grade = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_deducted_till_date = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    taxable_earnings_till_date = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_benefits = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    leave_encashment_amount_per_day = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
