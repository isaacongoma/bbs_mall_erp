from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankStatementImportLogColumnMapGenerated(FrappeChildModel):
    doctype = 'Bank Statement Import Log Column Map'
    header_text = models.CharField(max_length=140, blank=True, null=True, default='')
    maps_to = models.CharField(max_length=140, blank=True, null=True, default='')
    index = models.IntegerField(null=True, blank=True)
    variable = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
