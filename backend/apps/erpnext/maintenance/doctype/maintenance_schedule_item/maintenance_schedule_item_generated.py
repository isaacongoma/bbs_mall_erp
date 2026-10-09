from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MaintenanceScheduleItemGenerated(FrappeChildModel):
    doctype = 'Maintenance Schedule Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    periodicity = models.CharField(max_length=140, blank=True, null=True, default='')
    no_of_visits = models.IntegerField(null=True, blank=True)
    sales_person = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_no = models.TextField(blank=True, null=True, default='')
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
