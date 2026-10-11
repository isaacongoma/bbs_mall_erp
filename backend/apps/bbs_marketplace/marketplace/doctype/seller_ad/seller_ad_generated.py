from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerAdGenerated(FrappeModel):
    doctype = 'Seller Ad'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='SAD-.YYYY.-')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    package = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending Payment')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    vat_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    paid_on = models.DateField(null=True, blank=True)
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
