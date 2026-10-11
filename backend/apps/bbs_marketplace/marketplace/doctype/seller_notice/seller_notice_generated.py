from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerNoticeGenerated(FrappeModel):
    doctype = 'Seller Notice'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    audience = models.CharField(max_length=140, blank=True, null=True, default='All Sellers')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    published = models.SmallIntegerField(default=1)
    publish_on = FrappeDateTimeField(null=True, blank=True)
    message = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
