from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BomOperationGenerated(FrappeChildModel):
    doctype = 'BOM Operation'
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    hour_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    time_in_mins = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fixed_time = models.SmallIntegerField(default=0)
    operating_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_hour_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_operating_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    image = models.TextField(blank=True, null=True, default='')
    batch_size = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sequence_id = models.IntegerField(null=True, blank=True)
    cost_per_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_cost_per_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    set_cost_based_on_bom_qty = models.SmallIntegerField(default=0)
    workstation_type = models.CharField(max_length=140, blank=True, null=True, default='')
    finished_good = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    finished_good_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_final_finished_good = models.SmallIntegerField(default=0)
    wip_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    fg_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    source_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    is_subcontracted = models.SmallIntegerField(default=0)
    skip_material_transfer = models.SmallIntegerField(default=0)
    backflush_from_wip_warehouse = models.SmallIntegerField(default=0)
    quality_inspection_required = models.SmallIntegerField(default=0)
    batch_split = models.SmallIntegerField(default=0)
    weight_per_piece = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
