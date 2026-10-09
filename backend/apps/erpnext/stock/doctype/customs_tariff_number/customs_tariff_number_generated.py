from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomsTariffNumberGenerated(FrappeModel):
    doctype = 'Customs Tariff Number'
    tariff_number = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
