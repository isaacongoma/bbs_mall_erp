from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DeletedDocumentGenerated(FrappeModel):
    doctype = 'Deleted Document'
    deleted_name = models.CharField(max_length=140, blank=True, null=True, default='')
    deleted_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    restored = models.SmallIntegerField(default=0)
    new_name = models.CharField(max_length=140, blank=True, null=True, default='')
    data = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
