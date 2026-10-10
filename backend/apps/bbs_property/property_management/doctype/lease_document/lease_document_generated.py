from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaseDocumentGenerated(FrappeChildModel):
    doctype = 'Lease Document'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    file = models.TextField(blank=True, null=True, default='')
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
