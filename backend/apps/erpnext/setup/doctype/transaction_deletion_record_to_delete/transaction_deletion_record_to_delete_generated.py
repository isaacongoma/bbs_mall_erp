from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TransactionDeletionRecordToDeleteGenerated(FrappeChildModel):
    doctype = 'Transaction Deletion Record To Delete'
    doctype_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company_field = models.CharField(max_length=140, blank=True, null=True, default='')
    document_count = models.IntegerField(null=True, blank=True)
    child_doctypes = models.TextField(blank=True, null=True, default='')
    deleted = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
