from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ContractGenerated(FrappeModel):
    doctype = 'Contract'
    party_type = models.CharField(max_length=140, blank=True, null=True, default='Customer')
    is_signed = models.SmallIntegerField(default=0)
    party_name = models.CharField(max_length=140, blank=True, null=True, default='')
    party_user = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    fulfilment_status = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    signee = models.CharField(max_length=140, blank=True, null=True, default='')
    signed_on = FrappeDateTimeField(null=True, blank=True)
    ip_address = models.CharField(max_length=140, blank=True, null=True, default='')
    contract_template = models.CharField(max_length=140, blank=True, null=True, default='')
    contract_terms = models.TextField(blank=True, null=True, default='')
    requires_fulfilment = models.SmallIntegerField(default=0)
    fulfilment_deadline = models.DateField(null=True, blank=True)
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    document_name = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    signee_company = models.TextField(blank=True, null=True, default='')
    signed_by_company = models.CharField(max_length=140, blank=True, null=True, default='')
    party_full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
