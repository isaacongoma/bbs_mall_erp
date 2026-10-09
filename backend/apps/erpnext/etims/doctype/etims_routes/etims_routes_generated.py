from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsRoutesGenerated(FrappeModel):
    doctype = 'eTims Routes'
    vendor = models.CharField(max_length=140, blank=True, null=True, default='OSCU KRA')

    class Meta:
        abstract = True
