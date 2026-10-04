from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class MaintenanceVisitGenerated(FrappeModel):
    doctype = 'Maintenance Visit'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    address_display = models.TextField(blank=True, null=True, default='')
    contact_display = models.TextField(blank=True, null=True, default='')
    contact_mobile = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    mntc_date = models.DateField(null=True, blank=True)
    mntc_time = models.TimeField(null=True, blank=True)
    completion_status = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_type = models.CharField(max_length=140, blank=True, null=True, default='Unscheduled')
    customer_feedback = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_address = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_schedule = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_schedule_detail = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
