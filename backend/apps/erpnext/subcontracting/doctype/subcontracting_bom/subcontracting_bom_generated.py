from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingBomGenerated(FrappeModel):
    doctype = 'Subcontracting BOM'
    is_active = models.SmallIntegerField(default=1)
    finished_good = models.CharField(max_length=140, blank=True, null=True, default='')
    finished_good_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    finished_good_bom = models.CharField(max_length=140, blank=True, null=True, default='')
    service_item = models.CharField(max_length=140, blank=True, null=True, default='')
    service_item_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    service_item_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    finished_good_uom = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
