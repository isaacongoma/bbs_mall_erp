from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class IdentificationDocumentTypeGenerated(FrappeModel):
    doctype = 'Identification Document Type'
    identification_document_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
