from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SessionDefaultGenerated(FrappeChildModel):
    doctype = 'Session Default'
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
