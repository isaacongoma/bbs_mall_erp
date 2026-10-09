from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SystemHealthReportErrorsGenerated(FrappeChildModel):
    doctype = 'System Health Report Errors'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    occurrences = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
