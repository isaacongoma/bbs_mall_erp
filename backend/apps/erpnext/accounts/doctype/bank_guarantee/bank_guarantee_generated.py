from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankGuaranteeGenerated(FrappeModel):
    doctype = 'Bank Guarantee'
    bg_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    validity = models.IntegerField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    bank = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account_no = models.CharField(max_length=140, blank=True, null=True, default='')
    iban = models.CharField(max_length=140, blank=True, null=True, default='')
    branch_code = models.CharField(max_length=140, blank=True, null=True, default='')
    swift_number = models.CharField(max_length=140, blank=True, null=True, default='')
    more_information = models.TextField(blank=True, null=True, default='')
    bank_guarantee_number = models.CharField(max_length=140, blank=True, null=True, default='')
    name_of_beneficiary = models.CharField(max_length=140, blank=True, null=True, default='')
    margin_money = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fixed_deposit_number = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
