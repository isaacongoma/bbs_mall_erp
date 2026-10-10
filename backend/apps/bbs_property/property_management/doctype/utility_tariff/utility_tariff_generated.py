from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UtilityTariffGenerated(FrappeModel):
    doctype = 'Utility Tariff'
    tariff_name = models.CharField(max_length=140, blank=True, null=True, default='')
    utility_type = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='kWh')
    disabled = models.SmallIntegerField(default=0)
    item = models.CharField(max_length=140, blank=True, null=True, default='')
    rate_per_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fixed_charge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    markup_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
