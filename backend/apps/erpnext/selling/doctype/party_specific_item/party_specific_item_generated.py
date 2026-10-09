from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PartySpecificItemGenerated(FrappeModel):
    doctype = 'Party Specific Item'
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    restrict_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    based_on_value = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
