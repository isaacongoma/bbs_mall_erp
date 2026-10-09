from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AmendedDocumentNamingSettingsGenerated(FrappeChildModel):
    doctype = 'Amended Document Naming Settings'
    action = models.CharField(max_length=140, blank=True, null=True, default='Amend Counter')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
