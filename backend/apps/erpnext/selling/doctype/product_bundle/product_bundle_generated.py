from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProductBundleGenerated(FrappeModel):
    doctype = 'Product Bundle'
    new_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.CharField(max_length=140, blank=True, null=True, default='')
    is_active = models.SmallIntegerField(default=1)
    disabled = models.SmallIntegerField(default=0)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
