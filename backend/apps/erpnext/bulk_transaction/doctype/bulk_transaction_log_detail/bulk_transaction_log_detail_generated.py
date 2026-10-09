from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BulkTransactionLogDetailGenerated(FrappeModel):
    doctype = 'Bulk Transaction Log Detail'
    transaction_name = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_status = models.CharField(max_length=140, blank=True, null=True, default='')
    error_description = models.TextField(blank=True, null=True, default='')
    from_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    to_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    time = FrappeTimeField(null=True, blank=True)
    retried = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
