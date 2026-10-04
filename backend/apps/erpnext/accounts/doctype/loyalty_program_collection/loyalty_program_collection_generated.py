from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LoyaltyProgramCollectionGenerated(FrappeChildModel):
    doctype = 'Loyalty Program Collection'
    tier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    min_spent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    collection_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
