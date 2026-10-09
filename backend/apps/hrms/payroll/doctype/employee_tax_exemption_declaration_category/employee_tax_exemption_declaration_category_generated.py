from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeTaxExemptionDeclarationCategoryGenerated(FrappeChildModel):
    doctype = 'Employee Tax Exemption Declaration Category'
    exemption_sub_category = models.CharField(max_length=140, blank=True, null=True, default='')
    exemption_category = models.CharField(max_length=140, blank=True, null=True, default='')
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
