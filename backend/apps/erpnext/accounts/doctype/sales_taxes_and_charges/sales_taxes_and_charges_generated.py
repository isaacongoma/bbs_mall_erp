from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SalesTaxesAndChargesGenerated(FrappeChildModel):
    doctype = 'Sales Taxes and Charges'
    charge_type = models.CharField(max_length=140, blank=True, null=True, default='')
    row_id = models.CharField(max_length=140, blank=True, null=True, default='')
    account_head = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default=':Company')
    description = models.TextField(blank=True, null=True, default='')
    included_in_print_rate = models.SmallIntegerField(default=0)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount_after_discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_tax_amount_after_discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    included_in_paid_amount = models.SmallIntegerField(default=0)
    dont_recompute_tax = models.SmallIntegerField(default=0)
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    set_by_item_tax_template = models.SmallIntegerField(default=0)
    is_tax_withholding_account = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
