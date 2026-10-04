from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkOrderOperationGenerated(FrappeChildModel):
    doctype = 'Work Order Operation'
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    bom = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    completed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    planned_start_time = models.DateTimeField(null=True, blank=True)
    planned_end_time = models.DateTimeField(null=True, blank=True)
    time_in_mins = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    hour_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    planned_operating_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    actual_operation_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_operating_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    batch_size = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sequence_id = models.IntegerField(null=True, blank=True)
    workstation_type = models.CharField(max_length=140, blank=True, null=True, default='')
    process_loss_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    finished_good = models.CharField(max_length=140, blank=True, null=True, default='')
    wip_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    fg_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    source_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    is_subcontracted = models.SmallIntegerField(default=0)
    skip_material_transfer = models.SmallIntegerField(default=0)
    backflush_from_wip_warehouse = models.SmallIntegerField(default=0)
    batch_split = models.SmallIntegerField(default=0)
    weight_per_piece = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    quality_inspection_required = models.SmallIntegerField(default=0)
    pending_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
