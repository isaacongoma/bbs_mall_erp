from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MasterProductionScheduleItemGenerated(FrappeChildModel):
    doctype = 'Master Production Schedule Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_date = models.DateField(null=True, blank=True)
    planned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    order_release_date = models.DateField(null=True, blank=True)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    cumulative_lead_time = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
