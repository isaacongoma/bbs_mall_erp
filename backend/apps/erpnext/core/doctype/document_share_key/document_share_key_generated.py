from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DocumentShareKeyGenerated(FrappeModel):
    doctype = 'Document Share Key'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    key = models.CharField(max_length=140, blank=True, null=True, default='')
    expires_on = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
