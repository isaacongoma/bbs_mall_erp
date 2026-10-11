from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CourierRateGenerated(FrappeChildModel):
    doctype = 'Courier Rate'
    zone = models.CharField(max_length=140, blank=True, null=True, default='')
    service_level = models.CharField(max_length=140, blank=True, null=True, default='Standard')
    min_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_kg_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    eta_days_min = models.IntegerField(null=True, blank=True)
    eta_days_max = models.IntegerField(null=True, blank=True)
    cod_fee_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
