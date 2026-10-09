from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TagLinkGenerated(FrappeModel):
    doctype = 'Tag Link'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    tag = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    document_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
