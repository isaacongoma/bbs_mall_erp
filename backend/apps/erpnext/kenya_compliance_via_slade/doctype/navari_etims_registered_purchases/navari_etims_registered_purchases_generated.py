from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsRegisteredPurchasesGenerated(FrappeModel):
    doctype = 'Navari eTims Registered Purchases'
    supplier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_branch_id = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_pin = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_invoice_number = models.CharField(max_length=140, blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    receipt_type_code = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_type_code = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    validated_date = FrappeDateTimeField(null=True, blank=True)
    sales_date = models.DateField(null=True, blank=True)
    stock_released_date = FrappeDateTimeField(null=True, blank=True)
    organisation = models.CharField(max_length=140, blank=True, null=True, default='')
    total_item_count = models.IntegerField(null=True, blank=True)
    total_taxable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    taxable_amount_a = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_amount_b = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_amount_c = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_amount_d = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_amount_e = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_rate_a = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_rate_b = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_rate_c = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_rate_d = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_rate_e = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount_a = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount_b = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount_c = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount_d = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount_e = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
