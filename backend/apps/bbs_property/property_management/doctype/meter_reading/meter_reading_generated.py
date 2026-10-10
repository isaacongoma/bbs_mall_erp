from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MeterReadingGenerated(FrappeModel):
    doctype = 'Meter Reading'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='MRD-.YYYY.-.#####')
    meter = models.CharField(max_length=140, blank=True, null=True, default='')
    utility_type = models.CharField(max_length=140, blank=True, null=True, default='')
    unit = models.CharField(max_length=140, blank=True, null=True, default='')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    reading_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Approved')
    source = models.CharField(max_length=140, blank=True, null=True, default='Staff')
    previous_reading = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_reading = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    multiplier = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    consumption = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tariff = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    photo = models.TextField(blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
