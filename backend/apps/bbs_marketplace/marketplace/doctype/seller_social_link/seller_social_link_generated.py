from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerSocialLinkGenerated(FrappeChildModel):
    doctype = 'Seller Social Link'
    platform = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
