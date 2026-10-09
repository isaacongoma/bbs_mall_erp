from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityInspectionGenerated(FrappeModel):
    doctype = 'Quality Inspection'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    report_date = models.DateField(null=True, blank=True)
    inspection_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_serial_no = models.CharField(max_length=140, blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    sample_size = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    inspected_by = models.CharField(max_length=140, blank=True, null=True, default='user')
    verified_by = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    quality_inspection_template = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Accepted')
    manual_inspection = models.SmallIntegerField(default=0)
    child_row_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
