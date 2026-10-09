from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TravelRequestCostingGenerated(FrappeChildModel):
    doctype = 'Travel Request Costing'
    expense_type = models.CharField(max_length=140, blank=True, null=True, default='')
    sponsored_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    funded_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    comments = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
