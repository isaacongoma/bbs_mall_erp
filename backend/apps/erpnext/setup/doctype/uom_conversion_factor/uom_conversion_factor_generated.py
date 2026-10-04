from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class UomConversionFactorGenerated(FrappeModel):
    doctype = 'UOM Conversion Factor'
    category = models.CharField(max_length=140, blank=True, null=True, default='')
    from_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    to_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
