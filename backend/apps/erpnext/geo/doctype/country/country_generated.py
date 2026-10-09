from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CountryGenerated(FrappeModel):
    doctype = 'Country'
    country_name = models.CharField(max_length=140, blank=True, null=True, default='')
    date_format = models.CharField(max_length=140, blank=True, null=True, default='')
    time_format = models.CharField(max_length=140, blank=True, null=True, default='HH:mm:ss')
    time_zones = models.TextField(blank=True, null=True, default='')
    code = models.CharField(max_length=2, blank=True, null=True, default='')

    class Meta:
        abstract = True
