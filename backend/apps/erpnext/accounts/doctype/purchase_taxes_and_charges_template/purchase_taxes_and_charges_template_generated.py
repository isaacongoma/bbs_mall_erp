from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PurchaseTaxesAndChargesTemplateGenerated(FrappeModel):
    doctype = 'Purchase Taxes and Charges Template'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)
    disabled = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_category = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
