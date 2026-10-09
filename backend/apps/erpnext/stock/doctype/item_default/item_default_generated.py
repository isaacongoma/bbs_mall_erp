from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemDefaultGenerated(FrappeChildModel):
    doctype = 'Item Default'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    default_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    default_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    default_discount_account = models.CharField(max_length=140, blank=True, null=True, default='')
    default_inventory_account = models.CharField(max_length=140, blank=True, null=True, default='')
    inventory_account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_discount_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_inventory_account = models.CharField(max_length=140, blank=True, null=True, default='')
    buying_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    default_supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    default_provisional_account = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_expense_contra_account = models.CharField(max_length=140, blank=True, null=True, default='')
    expenses_added_to_stock_account = models.CharField(max_length=140, blank=True, null=True, default='')
    expenses_added_to_stock_contra_account = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_price_variance_account = models.CharField(max_length=140, blank=True, null=True, default='')
    manufacturing_variance_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_buying_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_provisional_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_purchase_expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_purchase_expense_contra_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_expenses_added_to_stock_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_expenses_added_to_stock_contra_account = models.CharField(max_length=140, blank=True, null=True, default='')
    selling_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_selling_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    default_cogs_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_default_cogs_account = models.CharField(max_length=140, blank=True, null=True, default='')
    deferred_expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    deferred_revenue_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_deferred_expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    vf_deferred_revenue_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
