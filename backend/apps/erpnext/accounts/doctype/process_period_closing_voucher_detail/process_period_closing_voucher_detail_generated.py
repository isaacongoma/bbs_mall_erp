from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProcessPeriodClosingVoucherDetailGenerated(FrappeChildModel):
    doctype = 'Process Period Closing Voucher Detail'
    processing_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Queued')
    closing_balance = models.TextField(blank=True, null=True, default='')
    report_type = models.CharField(max_length=140, blank=True, null=True, default='Profit and Loss')

    class Meta:
        abstract = True
