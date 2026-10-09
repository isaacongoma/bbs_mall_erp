from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class IncomeTaxSlabGenerated(FrappeModel):
    doctype = 'Income Tax Slab'
    effective_from = models.DateField(null=True, blank=True)
    allow_tax_exemption = models.SmallIntegerField(default=0)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    standard_tax_exemption_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_relief_limit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
