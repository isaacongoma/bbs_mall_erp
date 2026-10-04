from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class InstallationNoteGenerated(FrappeModel):
    doctype = 'Installation Note'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_address = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    address_display = models.TextField(blank=True, null=True, default='')
    contact_display = models.TextField(blank=True, null=True, default='')
    contact_mobile = models.TextField(blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    inst_date = models.DateField(null=True, blank=True)
    inst_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
