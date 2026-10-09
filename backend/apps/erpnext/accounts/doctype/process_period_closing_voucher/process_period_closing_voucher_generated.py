from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessPeriodClosingVoucherGenerated(FrappeModel):
    doctype = 'Process Period Closing Voucher'
    parent_pcv = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Queued')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    p_l_closing_balance = models.TextField(blank=True, null=True, default='')
    bs_closing_balance = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
