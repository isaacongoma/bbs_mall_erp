from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsCountryOfOriginGenerated(FrappeModel):
    doctype = 'eTims Country of Origin'
    code = models.CharField(max_length=140, blank=True, null=True, default='')
    alpha_3_code = models.CharField(max_length=140, blank=True, null=True, default='')
    currency_code = models.CharField(max_length=140, blank=True, null=True, default='')
    sort_order = models.CharField(max_length=140, blank=True, null=True, default='')
    country_code = models.CharField(max_length=140, blank=True, null=True, default='')
    code_name = models.CharField(max_length=140, blank=True, null=True, default='')
    code_description = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
