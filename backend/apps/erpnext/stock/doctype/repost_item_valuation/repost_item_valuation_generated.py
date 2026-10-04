from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class RepostItemValuationGenerated(FrappeModel):
    doctype = 'Repost Item Valuation'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    posting_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Queued')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    error_log = models.TextField(blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on = models.CharField(max_length=140, blank=True, null=True, default='Transaction')
    allow_negative_stock = models.SmallIntegerField(default=1)
    via_landed_cost_voucher = models.SmallIntegerField(default=0)
    allow_zero_rate = models.SmallIntegerField(default=0)
    items_to_be_repost = models.TextField(blank=True, null=True, default='')
    current_index = models.IntegerField(null=True, blank=True)
    gl_reposting_index = models.IntegerField(null=True, blank=True)
    total_reposting_count = models.IntegerField(null=True, blank=True)
    recreate_stock_ledgers = models.SmallIntegerField(default=0)
    reposting_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    repost_only_accounting_ledgers = models.SmallIntegerField(default=0)
    total_vouchers = models.IntegerField(null=True, blank=True)
    vouchers_posted = models.IntegerField(null=True, blank=True)
    reposting_data_file = models.TextField(blank=True, null=True, default='')
    recalculate_valuation_rate = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
