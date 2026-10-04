from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PeriodClosingVoucherGenerated(FrappeModel):
    doctype = 'Period Closing Voucher'
    transaction_date = models.DateField(null=True, blank=True)
    fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    closing_account_head = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    gle_processing_status = models.CharField(max_length=140, blank=True, null=True, default='')
    error_message = models.TextField(blank=True, null=True, default='')
    period_end_date = models.DateField(null=True, blank=True)
    period_start_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
