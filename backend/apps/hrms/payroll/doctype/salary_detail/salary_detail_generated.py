from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryDetailGenerated(FrappeChildModel):
    doctype = 'Salary Detail'
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')
    abbr = models.CharField(max_length=140, blank=True, null=True, default='')
    statistical_component = models.SmallIntegerField(default=0)
    is_tax_applicable = models.SmallIntegerField(default=0)
    is_flexible_benefit = models.SmallIntegerField(default=0)
    variable_based_on_taxable_salary = models.SmallIntegerField(default=0)
    depends_on_payment_days = models.SmallIntegerField(default=0)
    deduct_full_tax_on_selected_payroll_date = models.SmallIntegerField(default=0)
    condition = models.TextField(blank=True, null=True, default='')
    amount_based_on_formula = models.SmallIntegerField(default=0)
    formula = models.TextField(blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    do_not_include_in_total = models.SmallIntegerField(default=0)
    default_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    additional_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_on_flexible_benefit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_on_additional_salary = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    additional_salary = models.CharField(max_length=140, blank=True, null=True, default='')
    exempted_from_income_tax = models.SmallIntegerField(default=0)
    year_to_date = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_recurring_additional_salary = models.SmallIntegerField(default=0)
    do_not_include_in_accounts = models.SmallIntegerField(default=0)
    accrual_component = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
