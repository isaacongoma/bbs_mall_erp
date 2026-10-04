from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class TaxWithholdingEntryGenerated(FrappeChildModel):
    doctype = 'Tax Withholding Entry'
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_id = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_withholding_category = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    taxable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    lower_deduction_certificate = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    withholding_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    withholding_name = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_name = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_date = models.DateField(null=True, blank=True)
    withholding_date = models.DateField(null=True, blank=True)
    under_withheld_reason = models.CharField(max_length=140, blank=True, null=True, default='')
    withholding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_withholding_group = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    created_by_migration = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
