from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsUserGenerated(FrappeModel):
    doctype = 'Navari eTims User'
    system_user = models.CharField(max_length=140, blank=True, null=True, default='')
    first_name = models.CharField(max_length=140, blank=True, null=True, default='')
    last_name = models.CharField(max_length=140, blank=True, null=True, default='')
    users_full_names = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    submitted_successfully_to_etims = models.SmallIntegerField(default=0)
    sent_to_slade = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
