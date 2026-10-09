from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsSalesLedgerEntryGenerated(FrappeModel):
    doctype = 'eTIMS Sales Ledger Entry'
    etims_settings = models.CharField(max_length=140, blank=True, null=True, default='')
    etims_id = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_date = FrappeDateTimeField(null=True, blank=True)
    is_signed = models.SmallIntegerField(default=0)
    reference_number = models.CharField(max_length=140, blank=True, null=True, default='')
    document_number = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_type = models.CharField(max_length=140, blank=True, null=True, default='')
    workflow_state = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    etims_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    original_etims_invoice_counter = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_tax_id = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_inclusive_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_exclusive_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_vat = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_gross_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    scu_invoice_number = models.CharField(max_length=140, blank=True, null=True, default='')
    scu_receipt_number = models.IntegerField(null=True, blank=True)
    scu_id = models.CharField(max_length=140, blank=True, null=True, default='')
    scu_mrc_number = models.CharField(max_length=140, blank=True, null=True, default='')
    scu_receipt_signature = models.CharField(max_length=140, blank=True, null=True, default='')
    scu_receipt_date = models.DateField(null=True, blank=True)
    scu_receipt_time = FrappeTimeField(null=True, blank=True)
    etims_qr_code_url = models.TextField(blank=True, null=True, default='')
    scu_internal_data = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
