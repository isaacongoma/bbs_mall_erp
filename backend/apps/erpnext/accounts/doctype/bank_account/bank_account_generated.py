from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankAccountGenerated(FrappeModel):
    doctype = 'Bank Account'
    account_name = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    bank = models.CharField(max_length=140, blank=True, null=True, default='')
    account_type = models.CharField(max_length=140, blank=True, null=True, default='')
    account_subtype = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)
    is_company_account = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    iban = models.CharField(max_length=34, blank=True, null=True, default='')
    bank_account_no = models.CharField(max_length=30, blank=True, null=True, default='')
    statement_password = models.TextField(blank=True, null=True, default='')
    integration_id = models.CharField(max_length=140, blank=True, null=True, default='')
    last_integration_date = models.DateField(null=True, blank=True)
    mask = models.CharField(max_length=140, blank=True, null=True, default='')
    branch_code = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    is_credit_card = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
