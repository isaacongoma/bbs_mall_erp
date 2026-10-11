from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductReviewGenerated(FrappeModel):
    doctype = 'Product Review'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='REV-.YYYY.-')
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    marketplace_order = models.CharField(max_length=140, blank=True, null=True, default='')
    rating = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    verified_purchase = models.SmallIntegerField(default=0)
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    body = models.TextField(blank=True, null=True, default='')
    seller_reply = models.TextField(blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
