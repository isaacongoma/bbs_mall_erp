from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemVariantAttributeGenerated(FrappeChildModel):
    doctype = 'Item Variant Attribute'
    variant_of = models.CharField(max_length=140, blank=True, null=True, default='')
    attribute = models.CharField(max_length=140, blank=True, null=True, default='')
    attribute_value = models.CharField(max_length=140, blank=True, null=True, default='')
    numeric_values = models.SmallIntegerField(default=0)
    from_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    increment = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    to_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
