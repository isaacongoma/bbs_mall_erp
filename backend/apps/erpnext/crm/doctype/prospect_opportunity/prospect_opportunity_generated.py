from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProspectOpportunityGenerated(FrappeChildModel):
    doctype = 'Prospect Opportunity'
    opportunity = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stage = models.CharField(max_length=140, blank=True, null=True, default='')
    probability = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expected_closing = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    deal_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_person = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
