from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListingDigitalFileGenerated(FrappeChildModel):
    doctype = 'Listing Digital File'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    file = models.TextField(blank=True, null=True, default='')
    version = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
