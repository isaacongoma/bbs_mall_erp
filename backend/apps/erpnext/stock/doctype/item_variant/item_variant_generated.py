from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemVariantGenerated(FrappeChildModel):
    doctype = 'Item Variant'
    item_attribute = models.CharField(max_length=140, blank=True, null=True, default='')
    item_attribute_value = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
