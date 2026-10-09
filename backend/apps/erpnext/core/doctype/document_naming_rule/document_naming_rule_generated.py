from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DocumentNamingRuleGenerated(FrappeModel):
    doctype = 'Document Naming Rule'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    prefix = models.CharField(max_length=140, blank=True, null=True, default='')
    counter = models.IntegerField(null=True, blank=True)
    prefix_digits = models.IntegerField(null=True, blank=True)
    priority = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
