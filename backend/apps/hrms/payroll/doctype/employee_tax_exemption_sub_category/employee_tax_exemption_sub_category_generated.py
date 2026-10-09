from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeTaxExemptionSubCategoryGenerated(FrappeModel):
    doctype = 'Employee Tax Exemption Sub Category'
    exemption_category = models.CharField(max_length=140, blank=True, null=True, default='')
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_active = models.SmallIntegerField(default=1)
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
