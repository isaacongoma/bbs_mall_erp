from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DoctypeToSyncGenerated(FrappeChildModel):
    doctype = 'Doctype To Sync'
    doc_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
