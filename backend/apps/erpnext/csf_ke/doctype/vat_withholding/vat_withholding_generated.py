from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class VatWithholdingGenerated(FrappeModel):
    doctype = 'VAT Withholding'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    submit_journal_entry = models.SmallIntegerField(default=0)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    withholding_account = models.CharField(max_length=140, blank=True, null=True, default='')
    allocate_payment = models.SmallIntegerField(default=0)
    withholder_pin = models.CharField(max_length=140, blank=True, null=True, default='')
    withholdee_pin = models.CharField(max_length=140, blank=True, null=True, default='')
    withholder_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_no = models.CharField(max_length=140, blank=True, null=True, default='')
    certificate_date = models.DateField(null=True, blank=True)
    wht_certificate_no = models.CharField(max_length=140, blank=True, null=True, default='')
    pay_point_name = models.CharField(max_length=140, blank=True, null=True, default='')
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    vat_withholding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
