from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingInwardOrderGenerated(FrappeModel):
    doctype = 'Subcontracting Inward Order'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_date = models.DateField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    per_delivered = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_produced = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_process_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    set_delivery_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    per_returned = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_raw_material_returned = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_raw_material_received = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
