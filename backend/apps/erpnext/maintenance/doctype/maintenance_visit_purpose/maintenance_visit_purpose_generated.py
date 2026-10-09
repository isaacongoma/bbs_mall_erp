from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MaintenanceVisitPurposeGenerated(FrappeChildModel):
    doctype = 'Maintenance Visit Purpose'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_no = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    service_person = models.CharField(max_length=140, blank=True, null=True, default='')
    work_done = models.TextField(blank=True, null=True, default='')
    prevdoc_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    prevdoc_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_schedule_detail = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
