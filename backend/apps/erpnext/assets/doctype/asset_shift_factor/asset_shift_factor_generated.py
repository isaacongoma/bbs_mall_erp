from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetShiftFactorGenerated(FrappeModel):
    doctype = 'Asset Shift Factor'
    shift_name = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    default = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
