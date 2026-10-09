from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TaxWithholdingRateGenerated(FrappeChildModel):
    doctype = 'Tax Withholding Rate'
    tax_withholding_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    single_threshold = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cumulative_threshold = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    tax_withholding_group = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
