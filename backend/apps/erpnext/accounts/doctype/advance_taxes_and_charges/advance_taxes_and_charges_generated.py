from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AdvanceTaxesAndChargesGenerated(FrappeChildModel):
    doctype = 'Advance Taxes and Charges'
    charge_type = models.CharField(max_length=140, blank=True, null=True, default='')
    row_id = models.CharField(max_length=140, blank=True, null=True, default='')
    account_head = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default=':Company')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    add_deduct_tax = models.CharField(max_length=140, blank=True, null=True, default='')
    included_in_paid_amount = models.SmallIntegerField(default=0)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    set_by_item_tax_template = models.SmallIntegerField(default=0)
    is_tax_withholding_account = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
