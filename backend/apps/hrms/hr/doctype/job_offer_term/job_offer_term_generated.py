from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobOfferTermGenerated(FrappeChildModel):
    doctype = 'Job Offer Term'
    offer_term = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
