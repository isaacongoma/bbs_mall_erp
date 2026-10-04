from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DocumentFollowGenerated(FrappeModel):
    doctype = 'Document Follow'
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
