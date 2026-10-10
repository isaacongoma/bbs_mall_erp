from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TenantSalesDeclarationGenerated(FrappeModel):
    doctype = 'Tenant Sales Declaration'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='TSD-.YYYY.-.#####')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending Approval')
    source = models.CharField(max_length=140, blank=True, null=True, default='Staff')
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    gross_sales = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    evidence = models.TextField(blank=True, null=True, default='')
    turnover_rent_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rent_for_period = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    turnover_rent_due = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
