from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ContractTemplateGenerated(FrappeModel):
    doctype = 'Contract Template'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    contract_terms = models.TextField(blank=True, null=True, default='')
    requires_fulfilment = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
