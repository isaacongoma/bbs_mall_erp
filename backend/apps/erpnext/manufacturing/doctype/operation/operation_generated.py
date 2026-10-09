from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OperationGenerated(FrappeModel):
    doctype = 'Operation'
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    work_instruction = models.TextField(blank=True, null=True, default='')
    total_operation_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    batch_size = models.IntegerField(null=True, blank=True)
    create_job_card_based_on_batch_size = models.SmallIntegerField(default=0)
    is_corrective_operation = models.SmallIntegerField(default=0)
    quality_inspection_template = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
