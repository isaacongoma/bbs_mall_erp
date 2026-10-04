from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class RepostAllowedTypesGenerated(FrappeChildModel):
    doctype = 'Repost Allowed Types'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
