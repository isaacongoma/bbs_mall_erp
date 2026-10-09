from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessStatementOfAccountsCcGenerated(FrappeChildModel):
    doctype = 'Process Statement Of Accounts CC'
    cc = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
