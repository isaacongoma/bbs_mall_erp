from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShareTransferGenerated(FrappeModel):
    doctype = 'Share Transfer'
    transfer_type = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    from_shareholder = models.CharField(max_length=140, blank=True, null=True, default='')
    from_folio_no = models.CharField(max_length=140, blank=True, null=True, default='')
    equity_or_liability_account = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_account = models.CharField(max_length=140, blank=True, null=True, default='')
    to_shareholder = models.CharField(max_length=140, blank=True, null=True, default='')
    to_folio_no = models.CharField(max_length=140, blank=True, null=True, default='')
    share_type = models.CharField(max_length=140, blank=True, null=True, default='')
    from_no = models.IntegerField(null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    no_of_shares = models.IntegerField(null=True, blank=True)
    to_no = models.IntegerField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
