from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CurrencyExchangeSettingsDetailsGenerated(FrappeChildModel):
    doctype = 'Currency Exchange Settings Details'
    key = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
