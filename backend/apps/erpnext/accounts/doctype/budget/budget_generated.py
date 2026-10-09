from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BudgetGenerated(FrappeModel):
    doctype = 'Budget'
    budget_against = models.CharField(max_length=140, blank=True, null=True, default='Cost Center')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    applicable_on_material_request = models.SmallIntegerField(default=0)
    action_if_annual_budget_exceeded_on_mr = models.CharField(max_length=140, blank=True, null=True, default='Stop')
    action_if_accumulated_monthly_budget_exceeded_on_mr = models.CharField(max_length=140, blank=True, null=True, default='Warn')
    applicable_on_purchase_order = models.SmallIntegerField(default=0)
    action_if_annual_budget_exceeded_on_po = models.CharField(max_length=140, blank=True, null=True, default='Stop')
    action_if_accumulated_monthly_budget_exceeded_on_po = models.CharField(max_length=140, blank=True, null=True, default='Warn')
    applicable_on_booking_actual_expenses = models.SmallIntegerField(default=0)
    action_if_annual_budget_exceeded = models.CharField(max_length=140, blank=True, null=True, default='Stop')
    action_if_accumulated_monthly_budget_exceeded = models.CharField(max_length=140, blank=True, null=True, default='Warn')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='BUDGET-.########')
    applicable_on_cumulative_expense = models.SmallIntegerField(default=0)
    action_if_annual_exceeded_on_cumulative_expense = models.CharField(max_length=140, blank=True, null=True, default='')
    action_if_accumulated_monthly_exceeded_on_cumulative_expense = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    budget_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    revision_of = models.CharField(max_length=140, blank=True, null=True, default='')
    distribute_equally = models.SmallIntegerField(default=1)
    from_fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    to_fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    budget_start_date = models.DateField(null=True, blank=True)
    budget_end_date = models.DateField(null=True, blank=True)
    distribution_frequency = models.CharField(max_length=140, blank=True, null=True, default='Monthly')
    budget_distribution_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
