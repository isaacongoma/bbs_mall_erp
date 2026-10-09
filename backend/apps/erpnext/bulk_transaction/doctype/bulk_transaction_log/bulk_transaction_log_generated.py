from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BulkTransactionLogGenerated(FrappeModel):
    doctype = 'Bulk Transaction Log'
    date = models.DateField(null=True, blank=True)
    log_entries = models.IntegerField(null=True, blank=True)
    succeeded = models.IntegerField(null=True, blank=True)
    failed = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
