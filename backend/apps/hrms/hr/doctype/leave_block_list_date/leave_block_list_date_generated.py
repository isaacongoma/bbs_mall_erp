from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveBlockListDateGenerated(FrappeChildModel):
    doctype = 'Leave Block List Date'
    block_date = models.DateField(null=True, blank=True)
    reason = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
