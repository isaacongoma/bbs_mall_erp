from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProformaInvoiceGenerated(FrappeModel):
    doctype = 'Proforma Invoice'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    proforma_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on = models.CharField(max_length=140, blank=True, null=True, default='Quantity')
    hide_item_qty = models.SmallIntegerField(default=0)
    total_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    proforma_pdf = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    sent_on = FrappeDateTimeField(null=True, blank=True)
    emailed_to = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
