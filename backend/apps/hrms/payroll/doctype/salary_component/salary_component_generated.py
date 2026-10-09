from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryComponentGenerated(FrappeModel):
    doctype = 'Salary Component'
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')
    salary_component_abbr = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_tax_applicable = models.SmallIntegerField(default=1)
    depends_on_payment_days = models.SmallIntegerField(default=1)
    do_not_include_in_total = models.SmallIntegerField(default=0)
    deduct_full_tax_on_selected_payroll_date = models.SmallIntegerField(default=0)
    disabled = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='')
    statistical_component = models.SmallIntegerField(default=0)
    is_flexible_benefit = models.SmallIntegerField(default=0)
    max_benefit_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    variable_based_on_taxable_salary = models.SmallIntegerField(default=0)
    condition = models.TextField(blank=True, null=True, default='')
    amount_based_on_formula = models.SmallIntegerField(default=0)
    formula = models.TextField(blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    round_to_the_nearest_integer = models.SmallIntegerField(default=0)
    exempted_from_income_tax = models.SmallIntegerField(default=0)
    is_income_tax_component = models.SmallIntegerField(default=0)
    remove_if_zero_valued = models.SmallIntegerField(default=1)
    do_not_include_in_accounts = models.SmallIntegerField(default=0)
    arrear_component = models.SmallIntegerField(default=0)
    accrual_component = models.SmallIntegerField(default=0)
    payout_method = models.CharField(max_length=140, blank=True, null=True, default='')
    final_cycle_accrual_payout = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
