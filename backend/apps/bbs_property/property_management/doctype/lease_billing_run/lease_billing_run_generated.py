from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaseBillingRunGenerated(FrappeModel):
    doctype = 'Lease Billing Run'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='LBR-.YYYY.-.#####')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    run_date = models.DateField(null=True, blank=True)
    include_utilities = models.SmallIntegerField(default=1)
    include_turnover = models.SmallIntegerField(default=1)
    submit_invoices = models.SmallIntegerField(default=1)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    leases_found = models.IntegerField(null=True, blank=True)
    invoices_created = models.IntegerField(null=True, blank=True)
    errors = models.IntegerField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
