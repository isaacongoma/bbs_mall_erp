from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ClosedDocumentGenerated(FrappeChildModel):
    doctype = 'Closed Document'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    closed = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
