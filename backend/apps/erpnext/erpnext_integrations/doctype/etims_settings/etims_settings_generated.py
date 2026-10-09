from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EtimsSettingsGenerated(FrappeModel):
    doctype = 'eTIMS Settings'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    branch_id = models.CharField(max_length=2, blank=True, null=True, default='00')
    provider = models.CharField(max_length=140, blank=True, null=True, default='OSCU KRA')
    environment = models.CharField(max_length=140, blank=True, null=True, default='Sandbox')
    is_active = models.SmallIntegerField(default=0)
    server_url = models.CharField(max_length=140, blank=True, null=True, default='')
    tin = models.CharField(max_length=140, blank=True, null=True, default='')
    device_serial_number = models.CharField(max_length=140, blank=True, null=True, default='')
    communication_key = models.TextField(blank=True, null=True, default='')
    scu_id = models.CharField(max_length=140, blank=True, null=True, default='')
    mrc_no = models.CharField(max_length=140, blank=True, null=True, default='')
    initialized_on = models.DateTimeField(null=True, blank=True)
    payment_type_code = models.CharField(max_length=140, blank=True, null=True, default='01')
    sales_status_code = models.CharField(max_length=140, blank=True, null=True, default='02')
    purchase_type_code = models.CharField(max_length=140, blank=True, null=True, default='N')
    purchase_receipt_type_code = models.CharField(max_length=140, blank=True, null=True, default='P')
    purchase_status_code = models.CharField(max_length=140, blank=True, null=True, default='02')
    max_attempts = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
