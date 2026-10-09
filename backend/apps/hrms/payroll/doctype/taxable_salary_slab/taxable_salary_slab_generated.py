from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TaxableSalarySlabGenerated(FrappeChildModel):
    doctype = 'Taxable Salary Slab'
    from_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    to_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    percent_deduction = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    condition = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
