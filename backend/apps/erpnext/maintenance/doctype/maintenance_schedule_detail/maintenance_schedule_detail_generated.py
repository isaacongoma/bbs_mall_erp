from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MaintenanceScheduleDetailGenerated(FrappeChildModel):
    doctype = 'Maintenance Schedule Detail'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    scheduled_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    sales_person = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_no = models.TextField(blank=True, null=True, default='')
    completion_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    item_reference = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
