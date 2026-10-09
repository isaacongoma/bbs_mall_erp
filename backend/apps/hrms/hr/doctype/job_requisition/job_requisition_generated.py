from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobRequisitionGenerated(FrappeModel):
    doctype = 'Job Requisition'
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    no_of_positions = models.IntegerField(null=True, blank=True)
    expected_compensation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    requested_by = models.CharField(max_length=140, blank=True, null=True, default='')
    requested_by_name = models.CharField(max_length=140, blank=True, null=True, default='')
    requested_by_dept = models.CharField(max_length=140, blank=True, null=True, default='')
    requested_by_designation = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    expected_by = models.DateField(null=True, blank=True)
    completed_on = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    reason_for_requesting = models.TextField(blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    time_to_fill = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
