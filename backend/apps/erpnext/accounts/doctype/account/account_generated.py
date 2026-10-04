from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AccountGenerated(FrappeTreeModel):
    doctype = 'Account'
    account_name = models.CharField(max_length=140, blank=True, null=True, default='')
    account_number = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    root_type = models.CharField(max_length=140, blank=True, null=True, default='')
    report_type = models.CharField(max_length=140, blank=True, null=True, default='')
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_account = models.CharField(max_length=140, blank=True, null=True, default='')
    account_type = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    freeze_account = models.CharField(max_length=140, blank=True, null=True, default='')
    balance_must_be = models.CharField(max_length=140, blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')
    include_in_gross = models.SmallIntegerField(default=0)
    disabled = models.SmallIntegerField(default=0)
    account_category = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
