from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DocumentNamingRuleConditionGenerated(FrappeChildModel):
    doctype = 'Document Naming Rule Condition'
    field = models.CharField(max_length=140, blank=True, null=True, default='')
    condition = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
