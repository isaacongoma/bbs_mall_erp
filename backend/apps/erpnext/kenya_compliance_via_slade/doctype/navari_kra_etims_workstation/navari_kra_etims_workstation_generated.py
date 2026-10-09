from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariKraEtimsWorkstationGenerated(FrappeModel):
    doctype = 'Navari KRA eTims Workstation'
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation_type = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation_type_display = models.CharField(max_length=140, blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    is_billing_point = models.SmallIntegerField(default=0)
    active = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
