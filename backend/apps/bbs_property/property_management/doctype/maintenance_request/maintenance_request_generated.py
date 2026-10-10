from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MaintenanceRequestGenerated(FrappeModel):
    doctype = 'Maintenance Request'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='MNT-.YYYY.-.#####')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    priority = models.CharField(max_length=140, blank=True, null=True, default='Medium')
    category = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='Staff')
    opened_on = FrappeDateTimeField(null=True, blank=True)
    due_by = FrappeDateTimeField(null=True, blank=True)
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    unit = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    assigned_to = models.CharField(max_length=140, blank=True, null=True, default='')
    contractor = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_order = models.CharField(max_length=140, blank=True, null=True, default='')
    estimated_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    chargeable_to_tenant = models.SmallIntegerField(default=0)
    charge_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    resolved_on = FrappeDateTimeField(null=True, blank=True)
    resolution = models.TextField(blank=True, null=True, default='')
    rating = models.CharField(max_length=140, blank=True, null=True, default='')
    feedback = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
