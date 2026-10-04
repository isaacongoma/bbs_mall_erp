from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class TransactionDeletionRecordDetailsGenerated(FrappeChildModel):
    doctype = 'Transaction Deletion Record Details'
    doctype_name = models.CharField(max_length=140, blank=True, null=True, default='')
    docfield_name = models.CharField(max_length=140, blank=True, null=True, default='')
    no_of_docs = models.IntegerField(null=True, blank=True)
    done = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
