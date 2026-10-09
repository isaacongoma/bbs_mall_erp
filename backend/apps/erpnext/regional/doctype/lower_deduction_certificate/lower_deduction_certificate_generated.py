from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LowerDeductionCertificateGenerated(FrappeModel):
    doctype = 'Lower Deduction Certificate'
    certificate_no = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    pan_no = models.CharField(max_length=140, blank=True, null=True, default='')
    valid_upto = models.DateField(null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    certificate_limit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_withholding_category = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
