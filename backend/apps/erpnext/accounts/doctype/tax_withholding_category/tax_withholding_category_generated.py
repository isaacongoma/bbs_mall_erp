from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TaxWithholdingCategoryGenerated(FrappeModel):
    doctype = 'Tax Withholding Category'
    category_name = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_on_excess_amount = models.SmallIntegerField(default=0)
    round_off_tax_amount = models.SmallIntegerField(default=0)
    tax_deduction_basis = models.CharField(max_length=140, blank=True, null=True, default='Net Total')
    disable_cumulative_threshold = models.SmallIntegerField(default=0)
    disable_transaction_threshold = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
