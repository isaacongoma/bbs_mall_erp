from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MaintenanceUpdateGenerated(FrappeChildModel):
    doctype = 'Maintenance Update'
    posted_on = FrappeDateTimeField(null=True, blank=True)
    posted_by = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    note = models.TextField(blank=True, null=True, default='')
    visible_to_tenant = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
