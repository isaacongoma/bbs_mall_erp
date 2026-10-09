from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellingItemPriceMarginGenerated(FrappeModel):
    doctype = 'Selling Item Price Margin'
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)
    price_list_action = models.CharField(max_length=140, blank=True, null=True, default='')
    selling_price = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    margin_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    buying_price = models.CharField(max_length=140, blank=True, null=True, default='')
    margin_type = models.CharField(max_length=140, blank=True, null=True, default='')
    margin_percentage_or_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
