from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AccountingDimensionGenerated(FrappeModel):
    doctype = 'Accounting Dimension'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
