from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemLeadTimeGenerated(FrappeModel):
    doctype = 'Item Lead Time'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    buffer_time = models.IntegerField(null=True, blank=True)
    no_of_shift = models.IntegerField(null=True, blank=True)
    manufacturing_time_in_mins = models.IntegerField(null=True, blank=True)
    total_workstation_time = models.IntegerField(null=True, blank=True)
    daily_yield = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    capacity_per_day = models.IntegerField(null=True, blank=True)
    no_of_units_produced = models.IntegerField(null=True, blank=True)
    purchase_time = models.IntegerField(null=True, blank=True)
    shift_time_in_hours = models.IntegerField(null=True, blank=True)
    no_of_workstations = models.IntegerField(null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
