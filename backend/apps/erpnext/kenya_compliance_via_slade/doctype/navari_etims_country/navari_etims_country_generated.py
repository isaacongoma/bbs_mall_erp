from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsCountryGenerated(FrappeModel):
    doctype = 'Navari eTims Country'
    code = models.CharField(max_length=140, blank=True, null=True, default='')
    currency_code = models.CharField(max_length=140, blank=True, null=True, default='')
    sort_order = models.CharField(max_length=140, blank=True, null=True, default='')
    code_name = models.CharField(max_length=140, blank=True, null=True, default='')
    code_description = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
