from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CourierGenerated(FrappeModel):
    doctype = 'Courier'
    courier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    courier_type = models.CharField(max_length=140, blank=True, null=True, default='Third Party')
    enabled = models.SmallIntegerField(default=1)
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    cod_supported = models.SmallIntegerField(default=0)
    max_weight_kg = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    insurance_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tracking_url_template = models.CharField(max_length=140, blank=True, null=True, default='')
    integration = models.CharField(max_length=140, blank=True, null=True, default='Manual')
    api_base_url = models.CharField(max_length=140, blank=True, null=True, default='')
    account_id = models.CharField(max_length=140, blank=True, null=True, default='')
    api_key = models.TextField(blank=True, null=True, default='')
    webhook_token = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
