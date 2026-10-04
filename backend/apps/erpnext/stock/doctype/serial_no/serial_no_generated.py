from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SerialNoGenerated(FrappeModel):
    doctype = 'Serial No'
    serial_no = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    brand = models.CharField(max_length=140, blank=True, null=True, default='')
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_status = models.CharField(max_length=140, blank=True, null=True, default='')
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_status = models.CharField(max_length=140, blank=True, null=True, default='')
    warranty_period = models.IntegerField(null=True, blank=True)
    warranty_expiry_date = models.DateField(null=True, blank=True)
    amc_expiry_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    work_order = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
